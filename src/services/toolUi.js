// Tool Call UI helpers

export function showToolCallUI(toolCalls, elements) {
  const { toolCallContainer, toolCallsList, toolOutputsList, submitToolOutputsBtn } = elements;
  toolCallsList.innerHTML = '';
  toolOutputsList.innerHTML = '';

  toolCalls.forEach(toolCall => {
    const toolCallDiv = document.createElement('div');
    toolCallDiv.className = 'tool-call-item';
    toolCallDiv.innerHTML = `
      <div class="tool-call-header">
        <span class="tool-name">${toolCall.toolName}</span>
        <span class="tool-call-id">${toolCall.toolCallId}</span>
      </div>
      <div class="tool-args">
        <strong>Arguments:</strong>
        <pre>${JSON.stringify(toolCall.args, null, 2)}</pre>
      </div>
    `;
    toolCallsList.appendChild(toolCallDiv);

    const toolOutputDiv = document.createElement('div');
    toolOutputDiv.className = 'tool-output-item';
    toolOutputDiv.innerHTML = `
      <div class="tool-output-header">
        <span class="tool-name">${toolCall.toolName}</span>
        <span class="tool-call-id">${toolCall.toolCallId}</span>
      </div>
      <textarea 
        class="tool-output-textarea" 
        data-tool-call-id="${toolCall.toolCallId}"
        placeholder="Enter the output for this tool call..."
      ></textarea>
    `;
    toolOutputsList.appendChild(toolOutputDiv);
  });

  toolCallContainer.style.display = 'block';
  submitToolOutputsBtn.style.display = 'block';
  submitToolOutputsBtn.disabled = false;
}

export function hideToolCallUI(elements) {
  const { toolCallContainer, toolCallsList, toolOutputsList, submitToolOutputsBtn } = elements;
  toolCallsList.innerHTML = '';
  toolOutputsList.innerHTML = '';
  submitToolOutputsBtn.style.display = 'none';
  submitToolOutputsBtn.disabled = false;
  toolCallContainer.style.display = 'none';
}

export function collectToolOutputs() {
  const toolOutputs = [];
  const textareas = document.querySelectorAll('.tool-output-textarea');
  textareas.forEach(textarea => {
    const toolCallId = textarea.dataset.toolCallId;
    const output = textarea.value.trim();
    if (output) {
      toolOutputs.push({ toolCallId, output });
    }
  });
  return toolOutputs;
}


