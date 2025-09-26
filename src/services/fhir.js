import { client, FHIR_WORKER_ID, FHIR_SERVER_BASE_URL } from '../config.js';
import { updateStatus } from '../utils/dom.js';
import { sleep } from '../utils/time.js';
import { extractJsonString, decodeHtmlEntities } from '../utils/json.js';
import { marked } from 'marked';

export async function processWithFHIRWorker(extractedContent, state, elements) {
  const { statusDiv } = elements || {};
  if (!FHIR_WORKER_ID || FHIR_WORKER_ID === 'your-fhir-worker-id') {
    console.warn('FHIR Worker ID not configured, skipping FHIR processing');
    return 'FHIR Worker ID not configured. Please set the FHIR_WORKER_ID in the code.';
  }

  try {
    updateStatus(statusDiv, '⚙️ FHIR: Creating session...');
    const fhirSession = await client.session.createSession({
      workerId: FHIR_WORKER_ID,
      messages: [{
        role: 'user',
        content: [{ type: 'text', text: `Process this.Clerking Notes:\n${extractedContent}` }]
      }]
    });

    state.currentFHIRSessionId = fhirSession.data.id;

    updateStatus(statusDiv, '⚙️ FHIR: Creating task...');
    const fhirTask = await client.task.createTask(state.currentFHIRSessionId);
    state.currentFHIRTaskId = fhirTask.data.id;

    updateStatus(statusDiv, '⚙️ FHIR: Waiting for processing to complete...');
    await pollForFHIRResult(state.currentFHIRSessionId, state.currentFHIRTaskId, elements);

    updateStatus(statusDiv, '⚙️ FHIR: Fetching results...');
    const fhirMessages = await client.session.listMessages(state.currentFHIRSessionId);
    const fhirLastMessage = fhirMessages.data[0];
    const fhirProcessedContent = client.session.parseMessage(fhirLastMessage);
    return fhirProcessedContent;
  } catch (error) {
    console.error('Error processing with FHIR worker:', error);
    return `Error processing with FHIR worker: ${error.message}`;
  }
}

export async function pollForFHIRResult(sessionId, taskId, elements) {
  const { statusDiv, toolUi } = elements;
  while (true) {
    const taskStatus = await client.task.getTask(sessionId, taskId);
    const status = taskStatus.data.status;
    updateStatus(statusDiv, `⚙️ FHIR processing status: "${status}"...`);

    if (status === 'completed') return taskStatus.data;
    if (status === 'requires_action') {
      const toolCalls = taskStatus.data.toolCalls;
      toolUi.showToolCallUI(toolCalls);
      updateStatus(statusDiv, '⚠️ Requires Action: FHIR tool calls needed. Please provide outputs below.', 'warning');
      return taskStatus.data;
    }
    if (['failed', 'cancelled', 'expired'].includes(status)) {
      throw new Error(`FHIR task failed with status: ${status}`);
    }
    await sleep(2000);
  }
}

export function showFHIRResults(fhirResult, elements) {
  const { fhirFullOutputPre, fhirJsonTextarea, resultsContainer, fhirMarkdownDiv } = elements;
  const text = typeof fhirResult === 'string' ? fhirResult : JSON.stringify(fhirResult, null, 2);
  if (fhirFullOutputPre) {
    fhirFullOutputPre.textContent = text;
  }
  const extracted = extractJsonString(text);
  if (fhirJsonTextarea) {
    fhirJsonTextarea.value = extracted || '';
  }
  if (fhirMarkdownDiv) {
    try {
      fhirMarkdownDiv.innerHTML = marked.parse(text);
    } catch (_) {
      fhirMarkdownDiv.textContent = text;
    }
  }
  document.getElementById('fhir-results-section').style.display = 'block';
  document.getElementById('save-fhir-btn').style.display = 'block';
  resultsContainer.style.display = 'block';
}

export async function saveFHIRToServer(resource) {
  // Normalize attachments to ensure data is base64-encoded
  const normalized = normalizeAttachmentData(deepClone(resource));
  const isBundle = resource.resourceType === 'Bundle';
  const hasId = typeof resource.id === 'string' && resource.id.length > 0;

  let url = `${FHIR_SERVER_BASE_URL}/`;
  let method = 'POST';
  if (!isBundle && hasId) {
    url = `${url}/${encodeURIComponent(resource.id)}`;
    method = 'PUT';
  }

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/fhir+json' },
    body: JSON.stringify(normalized)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`FHIR server responded ${response.status}: ${text}`);
  }

  return response;
}

// Build a minimal DocumentReference from plain text when JSON parsing fails
export function buildDocumentReferenceFromText(text) {
  const decoded = decodeHtmlEntities(text);
  const data = btoa(unescape(encodeURIComponent(decoded)));
  return {
    resourceType: 'DocumentReference',
    status: 'current',
    type: {
      text: 'Unstructured clinical note'
    },
    content: [
      {
        attachment: {
          contentType: 'text/plain',
          data
        }
      }
    ]
  };
}

// --- Helpers: Attachment normalization ---
function deepClone(obj) {
  try {
    return structuredClone(obj);
  } catch (_) {
    return JSON.parse(JSON.stringify(obj));
  }
}

function toBase64Utf8(text) {
  const decoded = decodeHtmlEntities(String(text ?? ''));
  return btoa(unescape(encodeURIComponent(decoded)));
}

function isLikelyBase64(str) {
  if (typeof str !== 'string' || str.length === 0) return false;
  try {
    const decoded = atob(str.replace(/\s+/g, ''));
    // If we can decode and re-encode to the same (ignoring whitespace), assume it's base64
    const re = btoa(decoded);
    return re.replace(/=+$/,'') === str.replace(/\s+/g, '').replace(/=+$/,'');
  } catch {
    return false;
  }
}

function normalizeAttachmentData(node) {
  if (Array.isArray(node)) {
    return node.map(normalizeAttachmentData);
  }
  if (node && typeof node === 'object') {
    // Detect FHIR Attachment-like shape
    const hasAttachmentShape = Object.prototype.hasOwnProperty.call(node, 'contentType') && Object.prototype.hasOwnProperty.call(node, 'data');
    if (hasAttachmentShape) {
      const current = node.data;
      if (!isLikelyBase64(current)) {
        node.data = toBase64Utf8(current);
      }
      return node;
    }
    // Recurse properties
    for (const key of Object.keys(node)) {
      node[key] = normalizeAttachmentData(node[key]);
    }
  }
  return node;
}


