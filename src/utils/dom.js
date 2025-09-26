// DOM/status helpers

export function updateStatus(statusEl, message, type = 'info') {
  statusEl.textContent = message;
  switch (type) {
    case 'error':
      statusEl.style.color = 'red';
      break;
    case 'success':
      statusEl.style.color = 'green';
      break;
    case 'warning':
      statusEl.style.color = 'orange';
      break;
    default:
      statusEl.style.color = 'black';
  }
}


