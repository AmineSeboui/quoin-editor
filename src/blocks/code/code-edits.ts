export type CodeField = { readonly value: string; readonly start: number; readonly end: number };

const INDENT = '  ';

const lineStartOf = (value: string, at: number): number => value.lastIndexOf('\n', at - 1) + 1;

const indent = (text: string) => text.replace(/^/gm, INDENT);
const outdent = (text: string) => text.replace(/^(?: {1,2}|\t)/gm, '');

// Every line the selection reaches into changes, a line it only reaches the start of does not. An end of the selection
// lands where the text before it does once the change is made, so it stays on the same character.
function shiftLines(field: CodeField, shift: (text: string) => string, keepStart: boolean): CodeField {
  const { value, start, end } = field;
  const from = lineStartOf(value, start);
  const reach = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const lineEnd = value.indexOf('\n', reach);
  const to = lineEnd === -1 ? value.length : lineEnd;
  const moved = (at: number) => from + shift(value.slice(from, Math.min(at, reach))).length + Math.max(0, at - reach);
  return {
    value: value.slice(0, from) + shift(value.slice(from, to)) + value.slice(to),
    start: keepStart ? start : moved(start),
    end: moved(end),
  };
}

export function indentLines(field: CodeField): CodeField {
  const wholeLines = field.start !== field.end && field.start === lineStartOf(field.value, field.start);
  return shiftLines(field, indent, wholeLines);
}

/** Null when no line the selection touches is indented. */
export function outdentLines(field: CodeField): CodeField | null {
  const next = shiftLines(field, outdent, false);
  return next.value === field.value ? null : next;
}

export function insertInCode({ value, start, end }: CodeField, text: string): CodeField {
  const caret = start + text.length;
  return { value: value.slice(0, start) + text + value.slice(end), start: caret, end: caret };
}

export const insertIndent = (field: CodeField): CodeField => insertInCode(field, INDENT);

export function newlineKeepingIndent(field: CodeField): CodeField {
  const before = field.value.slice(lineStartOf(field.value, field.start), field.start);
  return insertInCode(field, `\n${/^[ \t]*/.exec(before)?.[0] ?? ''}`);
}
