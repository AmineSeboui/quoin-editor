const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const MARKER_ONLY = /^\s*(?:[-*+]|\d+[.)]|#{1,6}|>)\s*$/;
const LINE_PREFIX = /^\s*(?:>\s?)*(?:(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?|#{1,6}\s+)?/;
const OPEN_ADDRESS = /\[([^\]]*)\]\(([^)\s]*)$/;
const OPEN_TEXT = /\[([^\]]*)$/;
const DOUBLE = ['**', '__', '~~'];
const WORD = /[\p{L}\p{N}]/u;

type Opened = { readonly token: string; readonly at: number };

const isSpace = (char: string | undefined) => char === undefined || /\s/.test(char);

function openFence(lines: readonly string[]): string | null {
  let open: string | null = null;
  for (const line of lines) {
    const fence = FENCE.exec(line)?.[1];
    if (open === null) open = fence ?? null;
    else if (fence !== undefined && fence[0] === open[0] && fence.length >= open.length && line.trim() === fence) {
      open = null;
    }
  }
  return open;
}

function closeLink(body: string): string {
  const address = OPEN_ADDRESS.exec(body);
  if (address !== null) {
    return address[2] === '' ? body.slice(0, address.index) + address[1] : `${body})`;
  }
  const text = OPEN_TEXT.exec(body);
  return text === null ? body : body.slice(0, text.index) + text[1];
}

function tokenAt(body: string, at: number): string | null {
  const two = body.slice(at, at + 2);
  if (DOUBLE.includes(two)) return two;
  const one = body[at];
  if (one === '*') return one;
  // An underscore between two letters is part of a word, never emphasis.
  if (one === '_' && !(WORD.test(body[at - 1] ?? '') && WORD.test(body[at + 1] ?? ''))) return one;
  return null;
}

function codeEnd(body: string, at: number): { end: number; run: string } {
  let end = at;
  while (body[end] === '`') end++;
  const run = body.slice(at, end);
  const close = body.indexOf(run, end);
  return { end: close === -1 ? -1 : close + run.length, run };
}

function closeInline(source: string): string {
  const body = closeLink(source);
  const opened: Opened[] = [];
  let code: Opened | null = null;
  for (let at = 0; at < body.length && code === null; ) {
    if (body[at] === '`') {
      const { end, run } = codeEnd(body, at);
      if (end === -1) code = { token: run, at };
      at = end === -1 ? body.length : end;
      continue;
    }
    if (body.startsWith('](', at)) {
      const close = body.indexOf(')', at);
      at = close === -1 ? body.length : close + 1;
      continue;
    }
    const token = tokenAt(body, at);
    if (token === null) {
      at++;
      continue;
    }
    const before = body[at - 1];
    const after = body[at + token.length];
    if (opened.at(-1)?.token === token && !isSpace(before)) opened.pop();
    else if (after === undefined || !isSpace(after)) opened.push({ token, at });
    at += token.length;
  }
  if (code !== null) opened.push(code);
  let text = body;
  // A marker nothing has followed yet is dropped, not closed on nothing.
  while (opened.length > 0 && opened[opened.length - 1].at + opened[opened.length - 1].token.length === text.length) {
    text = text.slice(0, opened.pop()!.at);
  }
  return text + opened.reverse().map(({ token }) => token).join('');
}

/**
 * Markdown that is still streaming, closed so it can be drawn: an open code fence, bold, italic, strike, inline code
 * and link are closed, and a list item, heading or quote with only its marker is left out. Only for display: the
 * markdown applied is the one that streamed.
 */
export function closeStreaming(markdown: string): string {
  const lines = markdown.split('\n');
  const fence = openFence(lines);
  if (fence !== null) return `${markdown}${markdown.endsWith('\n') ? '' : '\n'}${fence[0].repeat(fence.length)}`;
  const last = lines[lines.length - 1];
  const head = markdown.slice(0, markdown.length - last.length);
  if (last.trim() !== '' && MARKER_ONLY.test(last)) return head;
  const prefix = LINE_PREFIX.exec(last)?.[0] ?? '';
  return head + prefix + closeInline(last.slice(prefix.length));
}
