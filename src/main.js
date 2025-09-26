import './style.css';
import { client, WORKER_ID, FHIR_WORKER_ID, RADIOLOGY_WORKER_ID } from './config.js';
import * as toolUi from './services/toolUi.js';
import { processWithFHIRWorker as fhirProcessWithWorker, pollForFHIRResult as fhirPollForResult, showFHIRResults as fhirShowResults, saveFHIRToServer as fhirSave } from './services/fhir.js';
import { analyzeRadiologyImage as analyzeRadiologyImageSvc, showRadiologyResults as showRadiologyResultsSvc } from './services/radiology.js';
import { buildDocumentReferenceFromText } from './services/fhir.js';
import { sleep } from './utils/time.js';

// --- CONFIGURATION ---


// --- HTML ELEMENTS ---
const imageLoader = document.getElementById('imageLoader');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const imagePreview = document.getElementById('imagePreview');
const statusDiv = document.getElementById('status');
const controlsDiv = document.getElementById('controls');
const processButton = document.getElementById('processButton');
const radiologyButton = document.getElementById('radiologyButton');
const resultsContainer = document.getElementById('results-container');
const extractedContentDiv = document.getElementById('extracted-content');
const fhirFullOutputPre = document.getElementById('fhir-full-output');
const fhirJsonTextarea = document.getElementById('fhir-json');
const fhirMarkdownDiv = document.getElementById('fhir-md');
const processFhirBtn = document.getElementById('process-fhir-btn');
const saveFhirBtn = document.getElementById('save-fhir-btn');
const radiologyOutputPre = document.getElementById('radiology-output');
const radiologyMarkdownDiv = document.getElementById('radiology-md');
const resultsTabs = document.getElementById('results-tabs');

// Tool Call UI Elements
const toolCallContainer = document.getElementById('tool-call-container');
const toolCallsList = document.getElementById('tool-calls-list');
const toolOutputsList = document.getElementById('tool-outputs-list');
const submitToolOutputsBtn = document.getElementById('submit-tool-outputs');

let fileAsDataURL = null;
let currentSessionId = null;
let currentTaskId = null;
let currentToolCalls = [];
let currentFHIRSessionId = null;
let currentFHIRTaskId = null;

// --- EVENT LISTENERS ---

// 1. Handle file selection
imageLoader.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) {
    console.log('No file selected');
    return;
  }

  console.log('File selected:', file.name, file.type, file.size);
  
  const reader = new FileReader();
  reader.onload = (event) => {
    fileAsDataURL = event.target.result; // Store the Base64 data URL
    console.log('File read as data URL, length:', fileAsDataURL.length);
    
    // Display a preview on the canvas
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
      
      // Try to display on canvas first
      try {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.style.display = 'block';
        imagePreview.style.display = 'none'; // Hide img element when canvas works
        console.log('Canvas should now be visible');
      } catch (canvasError) {
        console.warn('Canvas display failed, using img element instead:', canvasError);
        canvas.style.display = 'none';
        // Fallback to img element
        imagePreview.src = fileAsDataURL;
        imagePreview.style.display = 'block';
      }
      
      controlsDiv.style.display = 'block';
      resultsContainer.style.display = 'none'; // Hide previous results
      statusDiv.textContent = 'Image loaded. Ready for analysis.';
      processButton.disabled = false;
    };
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      statusDiv.textContent = 'Error loading image. Please try a different file.';
      statusDiv.style.color = 'red';
    };
    img.src = fileAsDataURL;
  };
  reader.onerror = (error) => {
    console.error('Error reading file:', error);
    statusDiv.textContent = 'Error reading file. Please try again.';
    statusDiv.style.color = 'red';
  };
  reader.readAsDataURL(file); // Reads the file as a Base64 encoded string
});

// Handle tool output submission
submitToolOutputsBtn.addEventListener('click', async () => {
  try {
    const toolOutputs = toolUi.collectToolOutputs();
    if (toolOutputs.length === 0) {
      statusDiv.textContent = 'Please provide outputs for all tool calls.';
      statusDiv.style.color = 'red';
      return;
    }

    statusDiv.textContent = 'Submitting tool outputs...';
    statusDiv.style.color = 'black';
    submitToolOutputsBtn.disabled = true;

    // Determine which task to submit to based on current context
    let sessionId, taskId;
    if (currentFHIRSessionId && currentFHIRTaskId) {
      // We're in FHIR processing phase
      sessionId = currentFHIRSessionId;
      taskId = currentFHIRTaskId;
    } else {
      // We're in main processing phase
      sessionId = currentSessionId;
      taskId = currentTaskId;
    }

    // Submit tool outputs to the correct task
    await client.task.submitToolOutputs(sessionId, taskId, {
      toolOutputs: toolOutputs
    });

    // Hide tool call UI and continue polling
    toolUi.hideToolCallUI({ toolCallContainer, toolCallsList, toolOutputsList, submitToolOutputsBtn });
    statusDiv.textContent = 'Tool outputs submitted. Continuing analysis...';
    statusDiv.style.color = 'black';
    
    // Continue polling for the final result based on context
    let finalResult;
    if (currentFHIRSessionId && currentFHIRTaskId) {
      // We're in FHIR processing phase
      finalResult = await fhirPollForResult(sessionId, taskId, { statusDiv, toolUi: { showToolCallUI: (toolCalls) => toolUi.showToolCallUI(toolCalls, { toolCallContainer, toolCallsList, toolOutputsList, submitToolOutputsBtn }) } });
      
      // FHIR processing completed
      const fhirMessages = await client.session.listMessages(sessionId);
      const fhirLastMessage = fhirMessages.data[0];
      const fhirProcessedContent = client.session.parseMessage(fhirLastMessage);
      fhirShowResults(fhirProcessedContent, { fhirFullOutputPre, fhirJsonTextarea, resultsContainer, fhirMarkdownDiv });
      showTab('fhir-tab');
      statusDiv.textContent = '✅ FHIR Processing Complete!';
      statusDiv.style.color = 'green';
    } else {
      // We're in main processing phase
      finalResult = await pollForResult(sessionId, taskId);
      
      // Main processing completed
      const messages = await client.session.listMessages(sessionId);
      const lastMessage = messages.data[0];
      const extractedContent = client.session.parseMessage(lastMessage);
      hideImageAndShowExtractedContent(extractedContent);
      showTab('extracted-tab');
      statusDiv.textContent = '✅ Image Analysis Complete! Edit the content above and click "Process with FHIR Worker" when ready.';
      statusDiv.style.color = 'green';
    }

  } catch (error) {
    console.error('Error submitting tool outputs:', error);
    statusDiv.textContent = `Error submitting tool outputs: ${error.message}`;
    statusDiv.style.color = 'red';
    submitToolOutputsBtn.disabled = false;
  }
});

// Handle FHIR processing button click
processFhirBtn.addEventListener('click', async () => {
  try {
    const editedContent = extractedContentDiv.value.trim();
    if (!editedContent) {
      statusDiv.textContent = 'Please provide content to process with FHIR worker.';
      statusDiv.style.color = 'red';
      return;
    }

    processFhirBtn.disabled = true;
    statusDiv.textContent = '⚙️ Processing with FHIR worker...';
    statusDiv.style.color = 'black';
    
    // Process with FHIR worker using the edited content
    const state = { currentFHIRSessionId, currentFHIRTaskId };
    const fhirResult = await fhirProcessWithWorker(editedContent, state, { statusDiv, toolUi: { showToolCallUI: (toolCalls) => toolUi.showToolCallUI(toolCalls, { toolCallContainer, toolCallsList, toolOutputsList, submitToolOutputsBtn }) } });
    currentFHIRSessionId = state.currentFHIRSessionId;
    currentFHIRTaskId = state.currentFHIRTaskId;
    
    // Show FHIR results
    statusDiv.textContent = '✅ FHIR Processing Complete!';
    statusDiv.style.color = 'green';
    fhirShowResults(fhirResult, { fhirFullOutputPre, fhirJsonTextarea, resultsContainer, fhirMarkdownDiv });
    processFhirBtn.disabled = false;

  } catch (error) {
    console.error('Error processing with FHIR worker:', error);
    statusDiv.textContent = `Error processing with FHIR worker: ${error.message}`;
    statusDiv.style.color = 'red';
    processFhirBtn.disabled = false;
  }
});

// Handle Save to FHIR Server
saveFhirBtn.addEventListener('click', async () => {
  try {
    const raw = (fhirJsonTextarea ? fhirJsonTextarea.value : '').trim();
    if (!raw) {
      statusDiv.textContent = 'Please provide FHIR JSON to save.';
      statusDiv.style.color = 'red';
      return;
    }

    // Extract JSON if the text contains notes or code fences
    const jsonText = extractJsonString(raw) || raw;
    let resource;
    try {
      resource = JSON.parse(jsonText);
    } catch (e) {
      // Fallback: wrap as DocumentReference text attachment
      resource = buildDocumentReferenceFromText(jsonText);
    }

    saveFhirBtn.disabled = true;
    statusDiv.textContent = '⚙️ Saving to FHIR server...';
    statusDiv.style.color = 'black';

    const result = await fhirSave(resource);

    statusDiv.textContent = `✅ Saved to FHIR server: ${result.statusText || 'OK'}`;
    statusDiv.style.color = 'green';
    saveFhirBtn.disabled = false;
  } catch (error) {
    console.error('Error saving to FHIR server:', error);
    statusDiv.textContent = `Error saving to FHIR server: ${error.message}`;
    statusDiv.style.color = 'red';
    saveFhirBtn.disabled = false;
  }
});

// Handle Radiology Explain button click
radiologyButton.addEventListener('click', async () => {
  if (!fileAsDataURL) {
    statusDiv.textContent = 'Please select an image first.';
    statusDiv.style.color = 'red';
    return;
  }

  radiologyButton.disabled = true;
  resultsContainer.style.display = 'none';

  try {
    statusDiv.textContent = '⚙️ Step 1/3: Creating radiology session...';
    statusDiv.style.color = 'black';
    const radiologyContent = await analyzeRadiologyImageSvc(fileAsDataURL, { statusDiv, toolUi: { showToolCallUI: (toolCalls) => toolUi.showToolCallUI(toolCalls, { toolCallContainer, toolCallsList, toolOutputsList, submitToolOutputsBtn }) } });
    showRadiologyResultsSvc(radiologyContent, { radiologyOutputPre, resultsContainer, radiologyMarkdownDiv });
    showTab('radiology-tab');
    statusDiv.textContent = '✅ Radiology Analysis Complete!';
    statusDiv.style.color = 'green';
  } catch (error) {
    console.error('An error occurred during radiology analysis:', error);
    statusDiv.textContent = `Error: ${error.message}`;
    statusDiv.style.color = 'red';
    radiologyButton.disabled = false; // Re-enable on failure
  }
});

// 2. Handle the "Start Analysis" button click
processButton.addEventListener('click', async () => {
  if (!fileAsDataURL) {
    updateStatus('Please select an image first.', 'error');
    return;
  }

  processButton.disabled = true;
  resultsContainer.style.display = 'none';

  try {
    // STEP 1: Create a session
    console.log('Creating secure session...', client)
    statusDiv.textContent = '⚙️ Step 1/4: Creating secure session...';
    statusDiv.style.color = 'black';
    const session = await client.session.createSession({
      workerId: WORKER_ID,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'text',
            text: `What is in this image`
          },
          {
            type: 'image_url',
            image_url: {
              url: fileAsDataURL
            }
          }
        ]
      }]
    })
    console.log(session)
    const sessionId = session.data.id;
    currentSessionId = sessionId; // Store for tool call handling

    // STEP 2: Create a task with the image data
    statusDiv.textContent = '⚙️ Step 2/4: Sending image to AI Worker...';
    statusDiv.style.color = 'black';
    // We send the Base64 image data directly in the content.
    // The worker needs to be configured to handle this format.
    const task = await client.task.createTask(sessionId)
    const taskId = task.data.id;
    currentTaskId = taskId; // Store for tool call handling

    // STEP 3: Poll for the task result
    statusDiv.textContent = '⚙️ Step 3/5: Awaiting analysis...';
    statusDiv.style.color = 'black';
    const finalResult = await pollForResult(sessionId, taskId);
    
    // Get the extracted content from the first task
    const messages = await client.session.listMessages(sessionId);
    console.log('Messages:', messages);
    const lastMessage = messages.data[0];
    console.log('Last message:', lastMessage);
    const extractedContent = client.session.parseMessage(lastMessage);
    
    // Hide image and show extracted content (editable)
    hideImageAndShowExtractedContent(extractedContent);
    showTab('extracted-tab');
    
    // STEP 4: Wait for user to edit and trigger FHIR processing
    statusDiv.textContent = '✅ Image Analysis Complete! Edit the content above and click "Process with FHIR Worker" when ready.';
    statusDiv.style.color = 'green';



  } catch (error) {
    console.error('An error occurred:', error);
    statusDiv.textContent = `Error: ${error.message}`;
    statusDiv.style.color = 'red';
    processButton.disabled = false; // Re-enable on failure
  }
});


// --- HELPER FUNCTIONS ---

// Polls the get task endpoint until the task is completed or fails
async function pollForResult(sessionId, taskId) {
  while (true) {
    const taskStatus = await client.task.getTask(sessionId, taskId);
    console.log('Task status:', taskStatus)
    const status = taskStatus.data.status;
    
    statusDiv.textContent = `⚙️ Step 4/4: Task status is "${status}"...`;
    statusDiv.style.color = 'black';

    if (status === 'completed') {
      return taskStatus.data; // Success! Return the final data
    }

    if (status === 'requires_action') {
      const toolCalls = taskStatus.data.toolCalls;
      console.log('Tool calls required:', toolCalls);
      currentToolCalls = toolCalls;
      
      // Show tool call UI
      toolUi.showToolCallUI(toolCalls, { toolCallContainer, toolCallsList, toolOutputsList, submitToolOutputsBtn });
      statusDiv.textContent = '⚠️ Requires Action: Tool calls needed. Please provide outputs below.';
      statusDiv.style.color = 'orange';
      
      // Return the task data but don't continue polling
      // The user will submit tool outputs and then we'll continue
      return taskStatus.data;
    }

    if (['failed', 'cancelled', 'expired'].includes(status)) {
      throw new Error(`Task failed with status: ${status}`);
    }
    
    // Wait for 2 seconds before checking again
    await sleep(2000);
  }
}
// --- TOOL CALL HANDLING FUNCTIONS ---

// Tabs: simple show/hide logic
function showTab(tabId) {
  const panels = document.querySelectorAll('.tab-panel');
  panels.forEach(p => p.classList.remove('active'));
  const btns = document.querySelectorAll('.tab-btn');
  btns.forEach(b => b.classList.remove('active'));
  const activePanel = document.getElementById(tabId);
  if (activePanel) activePanel.classList.add('active');
  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add('active');
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  const tabId = btn.getAttribute('data-tab');
  showTab(tabId);
});

// --- FHIR WORKER PROCESSING FUNCTIONS ---

// Process extracted content with FHIR worker
async function processWithFHIRWorker(extractedContent) {
  if (!FHIR_WORKER_ID || FHIR_WORKER_ID === 'your-fhir-worker-id') {
    console.warn('FHIR Worker ID not configured, skipping FHIR processing');
    return 'FHIR Worker ID not configured. Please set the FHIR_WORKER_ID in the code.';
  }

  try {
    // Create a new session for FHIR processing
    const fhirSession = await client.session.createSession({
      workerId: FHIR_WORKER_ID,
      messages: [{
        role: 'user',
        content: [{
          type: 'text',
          text: `Process this.Clerking Notes:\n${extractedContent}`
        }]
      }]
    });

    const fhirSessionId = fhirSession.data.id;
    currentFHIRSessionId = fhirSessionId; // Store for tool call handling
    console.log('FHIR Session created:', fhirSessionId);

    // Create a task for FHIR processing
    const fhirTask = await client.task.createTask(fhirSessionId);
    const fhirTaskId = fhirTask.data.id;
    currentFHIRTaskId = fhirTaskId; // Store for tool call handling
    console.log('FHIR Task created:', fhirTaskId);

    // Poll for FHIR task completion
    const fhirFinalResult = await pollForFHIRResult(fhirSessionId, fhirTaskId);
    
    // Get the FHIR processing results
    const fhirMessages = await client.session.listMessages(fhirSessionId);
    const fhirLastMessage = fhirMessages.data[0];
    const fhirProcessedContent = client.session.parseMessage(fhirLastMessage);
    
    return fhirProcessedContent;

  } catch (error) {
    console.error('Error processing with FHIR worker:', error);
    return `Error processing with FHIR worker: ${error.message}`;
  }
}

// Poll for FHIR task completion
async function pollForFHIRResult(sessionId, taskId) {
  while (true) {
    const taskStatus = await client.task.getTask(sessionId, taskId);
    console.log('FHIR Task status:', taskStatus);
    const status = taskStatus.data.status;
    
    updateStatus(`⚙️ FHIR processing status: "${status}"...`);

    if (status === 'completed') {
      return taskStatus.data;
    }

    if (status === 'requires_action') {
      const toolCalls = taskStatus.data.toolCalls;
      console.log('FHIR Tool calls required:', toolCalls);
      currentToolCalls = toolCalls;
      
      // Show tool call UI for FHIR worker
      showToolCallUI(toolCalls);
      updateStatus('⚠️ Requires Action: FHIR tool calls needed. Please provide outputs below.', 'warning');
      
      // Return the task data but don't continue polling
      return taskStatus.data;
    }

    if (['failed', 'cancelled', 'expired'].includes(status)) {
      throw new Error(`FHIR task failed with status: ${status}`);
    }
    
    // Wait for 2 seconds before checking again
    await sleep(2000);
  }
}

// Hide image and show extracted content
function hideImageAndShowExtractedContent(extractedContent) {
  // Hide the image and controls
  canvas.style.display = 'none';
  imagePreview.style.display = 'none';
  controlsDiv.style.display = 'none';
  
  // Show only the extracted content section with editable textarea
  extractedContentDiv.value = extractedContent; // Use .value for textarea
  processFhirBtn.style.display = 'block'; // Show the FHIR processing button
  document.getElementById('extracted-content-section').style.display = 'block';
  document.getElementById('fhir-results-section').style.display = 'block';
  resultsTabs.style.display = 'flex';
  resultsContainer.style.display = 'block';
}

// Show FHIR results
function showFHIRResults(fhirResult) {
  // Show both sections now
  // fhirResultsDiv is a textarea, allow editing
  let text = typeof fhirResult === 'string' ? fhirResult : JSON.stringify(fhirResult, null, 2);
  // Show full output
  if (fhirFullOutputPre) {
    fhirFullOutputPre.textContent = text;
  }
  // Extract JSON for editable textarea
  const extracted = extractJsonString(text);
  if (fhirJsonTextarea) {
    fhirJsonTextarea.value = extracted || '';
  }
  document.getElementById('fhir-results-section').style.display = 'block';
  // Enable Save button now that we have FHIR output
  saveFhirBtn.style.display = 'block';
  resultsContainer.style.display = 'block';
}

// Display both extracted content and FHIR results (legacy function)
function displayResults(extractedContent, fhirResult) {
  extractedContentDiv.textContent = extractedContent;
  fhirResultsDiv.textContent = fhirResult;
  resultsContainer.style.display = 'block';
}

// Extract a JSON string from mixed text (supports ```json fences and balanced braces/brackets)
function extractJsonString(input) {
  if (!input || typeof input !== 'string') return null;
  // 1) Markdown code fence ```json ... ``` or ``` ... ```
  const fenceMatch = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }

  // 2) Find first JSON object { ... } with balanced braces
  const objStart = input.indexOf('{');
  if (objStart !== -1) {
    const objEnd = findMatchingBracket(input, objStart, '{', '}');
    if (objEnd !== -1) {
      return input.slice(objStart, objEnd + 1).trim();
    }
  }

  // 3) Find first JSON array [ ... ] with balanced brackets
  const arrStart = input.indexOf('[');
  if (arrStart !== -1) {
    const arrEnd = findMatchingBracket(input, arrStart, '[', ']');
    if (arrEnd !== -1) {
      return input.slice(arrStart, arrEnd + 1).trim();
    }
  }

  return null;
}

// Find matching closing bracket accounting for nested braces and ignoring braces in strings
function findMatchingBracket(text, startIndex, openCh, closeCh) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIndex; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === '\\') {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    } else {
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === openCh) depth++;
      else if (ch === closeCh) depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// Save FHIR JSON to a FHIR server using fetch
async function saveFHIRToServer(resource) {
  // Determine endpoint and method
  const isBundle = resource.resourceType === 'Bundle';
  const hasId = typeof resource.id === 'string' && resource.id.length > 0;

  // If it's a Bundle, POST to /Bundle; otherwise POST or PUT to /{resourceType}/[id]
  let url = `${FHIR_SERVER_BASE_URL}/`;
  let method = 'POST';
  if (!isBundle && hasId) {
    url = `${url}/${encodeURIComponent(resource.id)}`;
    method = 'PUT';
  }

  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/fhir+json'
    },
    body: JSON.stringify(resource)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`FHIR server responded ${response.status}: ${text}`);
  }

  return response;
}

// --- RADIOLOGY WORKER PROCESSING FUNCTIONS ---

// Poll for radiology task completion
async function pollForRadiologyResult(sessionId, taskId) {
  while (true) {
    const taskStatus = await client.task.getTask(sessionId, taskId);
    console.log('Radiology Task status:', taskStatus);
    const status = taskStatus.data.status;
    
    updateStatus(`⚙️ Radiology analysis status: "${status}"...`);

    if (status === 'completed') {
      return taskStatus.data;
    }

    if (status === 'requires_action') {
      const toolCalls = taskStatus.data.toolCalls;
      console.log('Radiology Tool calls required:', toolCalls);
      currentToolCalls = toolCalls;
      
      // Show tool call UI for radiology worker
      showToolCallUI(toolCalls);
      updateStatus('⚠️ Requires Action: Radiology tool calls needed. Please provide outputs below.', 'warning');
      
      // Return the task data but don't continue polling
      return taskStatus.data;
    }

    if (['failed', 'cancelled', 'expired'].includes(status)) {
      throw new Error(`Radiology task failed with status: ${status}`);
    }
    
    // Wait for 2 seconds before checking again
    await sleep(2000);
  }
}

// Show radiology results
function showRadiologyResults(radiologyContent) {
  if (radiologyOutputPre) {
    radiologyOutputPre.textContent = radiologyContent;
  }
  document.getElementById('radiology-results-section').style.display = 'block';
  resultsContainer.style.display = 'block';
}