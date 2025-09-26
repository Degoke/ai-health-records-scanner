// JSON parsing helpers

export function extractJsonString(input) {
  if (!input || typeof input !== 'string') return null;
  const fenceMatch = input.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }

  const objStart = input.indexOf('{');
  if (objStart !== -1) {
    const objEnd = findMatchingBracket(input, objStart, '{', '}');
    if (objEnd !== -1) {
      return input.slice(objStart, objEnd + 1).trim();
    }
  }

  const arrStart = input.indexOf('[');
  if (arrStart !== -1) {
    const arrEnd = findMatchingBracket(input, arrStart, '[', ']');
    if (arrEnd !== -1) {
      return input.slice(arrStart, arrEnd + 1).trim();
    }
  }

  return null;
}

export function findMatchingBracket(text, startIndex, openCh, closeCh) {
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

// Decode HTML entities commonly seen in text (e.g., \n as &#10;, > as &gt;)
export function decodeHtmlEntities(input) {
  if (typeof input !== 'string' || input.length === 0) return input;
  const el = document.createElement('textarea');
  el.innerHTML = input;
  const decoded = el.value;
  // Also normalize CRLF variants to \n
  return decoded.replace(/\r\n?/g, '\n');
}


