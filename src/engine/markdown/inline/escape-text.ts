import { matchAt } from './match-at';

export type EscapeContext = {
  lineStart: boolean;
  lineEnd: boolean;
  escapeLineStart: boolean;
  escapePipes: boolean;
  next: string;
  hardBreak?: 'backslash' | 'br';
  previous?: string;
  following?: string;
};

export const ALWAYS_ESCAPED = /[\\`*_[\]<~$]/;

const WORD_CHAR = /^[\p{L}\p{N}]$/u;
const LITERAL_AFTER_BACKSLASH = /^[^\s!-/:-@[-`{-~]$/;
const ENTITY_LIKE = /&#?[A-Za-z0-9]+;/y;
const ORDERED_MARKER = /[0-9]+(?=[.)])/y;
const LINE_START_SYNTAX = new Set(['#', '>', '=', '+', '-']);
const WHITESPACE_ENTITY: Readonly<Record<string, string>> = { ' ': '&#32;', '\t': '&#9;' };

// An underscore between two word characters never opens or closes emphasis, and a backslash before anything but ASCII
// punctuation or a line end is just a backslash. The neighbours across the edge of the text are not known here.
function needsEscape(text: string, index: number): boolean {
  const char = text[index];
  if (char === '_') return !(WORD_CHAR.test(text[index - 1] ?? '') && WORD_CHAR.test(text[index + 1] ?? ''));
  if (char === '\\') return !LITERAL_AFTER_BACKSLASH.test(text[index + 1] ?? '');
  return true;
}

export function escapeEntityAmpersands(value: string): string {
  return value.replace(/&(?=#?[A-Za-z0-9]+;)/g, '\\&');
}

function breaksWithTag(text: string, index: number, ctx: EscapeContext): boolean {
  if (ctx.hardBreak === 'br') return true;
  const startsRegion = index === 0 ? !ctx.previous || ctx.previous === '\n' : text[index - 1] === '\n';
  const endsRegion = index === text.length - 1 && !ctx.following;
  return startsRegion || endsRegion;
}

export function escapeText(text: string, ctx: EscapeContext): string {
  const last = text.length - 1;
  let atLineStart = ctx.lineStart;
  let out = '';
  for (let i = 0; i <= last; i++) {
    const char = text[i];
    if (char === '\n') {
      const tag = breaksWithTag(text, i, ctx);
      out += tag ? '<br>' : '\\\n';
      atLineStart = !tag;
      continue;
    }
    const lineStart = atLineStart;
    atLineStart = false;
    const ordered = lineStart && ctx.escapeLineStart ? matchAt(ORDERED_MARKER, text, i) : null;
    if (ordered) {
      out += `${ordered[0]}\\${text[i + ordered[0].length]}`;
      i += ordered[0].length;
    } else if (char === ' ' || char === '\t') {
      const lineEnd = text[i + 1] === '\n' || (i === last && ctx.lineEnd);
      out += lineStart || lineEnd ? WHITESPACE_ENTITY[char] : char;
    } else if (ALWAYS_ESCAPED.test(char) && needsEscape(text, i)) {
      out += `\\${char}`;
    } else if (char === '&') {
      out += matchAt(ENTITY_LIKE, text, i) ? '\\&' : '&';
    } else if (char === '!') {
      const bracket = i === last ? ctx.next[0] === '[' : text[i + 1] === '[';
      out += bracket ? '\\!' : '!';
    } else if (char === '|' && ctx.escapePipes) {
      out += '\\|';
    } else if (lineStart && ctx.escapeLineStart && LINE_START_SYNTAX.has(char)) {
      out += `\\${char}`;
    } else {
      out += char;
    }
  }
  return out;
}
