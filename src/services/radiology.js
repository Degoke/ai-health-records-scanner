import { client, RADIOLOGY_WORKER_ID } from '../config.js';
import { updateStatus } from '../utils/dom.js';
import { sleep } from '../utils/time.js';
import { marked } from 'marked';

export async function analyzeRadiologyImage(fileAsDataURL, elements) {
  const { statusDiv } = elements;
  const session = await client.session.createSession({
    workerId: RADIOLOGY_WORKER_ID,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this radiology image and provide a detailed explanation of what you observe. Include any findings, abnormalities, or notable features.' },
        { type: 'image_url', image_url: { url: fileAsDataURL } }
      ]
    }]
  });
  updateStatus(statusDiv, '⚙️ Step 2/3: Sending image to Radiology Worker...');
  const sessionId = session.data.id;
  const task = await client.task.createTask(sessionId);
  const taskId = task.data.id;
  await pollForRadiologyResult(sessionId, taskId, elements);
  const messages = await client.session.listMessages(sessionId);
  const lastMessage = messages.data[0];
  const radiologyContent = client.session.parseMessage(lastMessage);
  return radiologyContent;
}

export async function pollForRadiologyResult(sessionId, taskId, elements) {
  const { statusDiv, toolUi } = elements;
  while (true) {
    const taskStatus = await client.task.getTask(sessionId, taskId);
    const status = taskStatus.data.status;
    updateStatus(statusDiv, `⚙️ Radiology analysis status: "${status}"...`);
    if (status === 'completed') return taskStatus.data;
    if (status === 'requires_action') {
      const toolCalls = taskStatus.data.toolCalls;
      toolUi.showToolCallUI(toolCalls);
      updateStatus(statusDiv, '⚠️ Requires Action: Radiology tool calls needed. Please provide outputs below.', 'warning');
      return taskStatus.data;
    }
    if (['failed', 'cancelled', 'expired'].includes(status)) {
      throw new Error(`Radiology task failed with status: ${status}`);
    }
    await sleep(2000);
  }
}

export function showRadiologyResults(radiologyContent, elements) {
  const { radiologyOutputPre, resultsContainer, radiologyMarkdownDiv } = elements;
  if (radiologyOutputPre) {
    radiologyOutputPre.textContent = radiologyContent;
  }
  if (radiologyMarkdownDiv) {
    try {
      radiologyMarkdownDiv.innerHTML = marked.parse(String(radiologyContent || ''));
    } catch (_) {
      radiologyMarkdownDiv.textContent = String(radiologyContent || '');
    }
  }
  document.getElementById('radiology-results-section').style.display = 'block';
  resultsContainer.style.display = 'block';
}


