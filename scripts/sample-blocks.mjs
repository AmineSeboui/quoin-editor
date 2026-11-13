const OPENING = '{([';
const CLOSING = '})]';
const QUOTES = `'"\``;

/**
 * The text of the object literal that starts at `start`, with whatever is nested in it left out, so that only the
 * object's own fields remain.
 * @param {string} code
 * @param {number} start
 * @returns {string}
 */
function ownFields(code, start) {
  let depth = 0;
  let quote = null;
  let kept = '';
  for (let at = start; at < code.length; at++) {
    const char = code[at];
    if (quote === null && OPENING.includes(char)) {
      depth++;
      continue;
    }
    if (quote === null && CLOSING.includes(char)) {
      if (--depth === 0) return kept;
      continue;
    }
    if (quote === null && QUOTES.includes(char)) quote = char;
    else if (char === quote) quote = null;
    const escaped = quote !== null && char === '\\' ? code[++at] : '';
    if (depth === 1) kept += char + escaped;
  }
  return kept;
}

const field = (fields, name) => new RegExp(`(?:^|[\\s,])${name}:\\s*(['"])(.*?)\\1`).exec(fields)?.[2];

/**
 * The type and the label of every block a code sample defines with `defineBlock`, each `undefined` where the
 * definition does not spell it out as a string of its own, as one spread from another definition does.
 * @param {string} code
 * @returns {{ type: string | undefined, label: string | undefined }[]}
 */
export function blockDefinitions(code) {
  return [...code.matchAll(/\bdefineBlock\s*(?:<.*?>)?\s*\(\s*\{/gs)].map((call) => {
    const fields = ownFields(code, call.index + call[0].length - 1);
    return { type: field(fields, 'type'), label: field(fields, 'label') };
  });
}
