import { keyName, normalizeKey, type KeyLike } from '../../engine';
import { indentLines, insertIndent, newlineKeepingIndent, outdentLines, type CodeField } from './code-edits';

export type CodeKeyAction =
  | { kind: 'edit'; field: CodeField }
  | { kind: 'leave'; direction: -1 | 1; addsLine?: true }
  | { kind: 'paragraph' | 'undo' | 'redo' | 'selectAll' | 'escape' | 'controls' };

type KeyHandler = (field: CodeField) => CodeKeyAction | null;

const edit = (field: CodeField): CodeKeyAction => ({ kind: 'edit', field });

function leaveWhen(direction: -1 | 1, atEdge: (field: CodeField) => boolean, addsLine?: true): KeyHandler {
  return (field) =>
    field.start === field.end && atEdge(field) ? { kind: 'leave', direction, ...(addsLine && { addsLine }) } : null;
}

const KEYS: Readonly<Record<string, KeyHandler>> = {
  Tab: (field) => edit(field.start === field.end ? insertIndent(field) : indentLines(field)),
  'Shift-Tab': (field) => edit(outdentLines(field) ?? field),
  Enter: (field) => edit(newlineKeepingIndent(field)),
  ArrowUp: leaveWhen(-1, ({ value, start }) => !value.slice(0, start).includes('\n')),
  ArrowDown: leaveWhen(1, ({ value, end }) => !value.slice(end).includes('\n'), true),
  ArrowLeft: leaveWhen(-1, ({ start }) => start === 0),
  ArrowRight: leaveWhen(1, ({ value, end }) => end === value.length),
  Backspace: ({ value }) => (value === '' ? { kind: 'paragraph' } : null),
  Escape: () => ({ kind: 'escape' }),
  'Alt-F10': () => ({ kind: 'controls' }),
};

const MOD_KEYS: readonly (readonly [string, KeyHandler])[] = [
  ['Mod-z', () => ({ kind: 'undo' })],
  ['Mod-Shift-z', () => ({ kind: 'redo' })],
  ['Mod-y', () => ({ kind: 'redo' })],
  ['Mod-a', ({ value, start, end }) => (start === 0 && end === value.length ? { kind: 'selectAll' } : null)],
];

export function codeKeyAction(event: KeyLike, field: CodeField, isMac: boolean): CodeKeyAction | null {
  const name = keyName(event, isMac);
  const modKey = MOD_KEYS.find(([key]) => normalizeKey(key, isMac) === name);
  const handler = modKey?.[1] ?? (Object.hasOwn(KEYS, name) ? KEYS[name] : undefined);
  return handler?.(field) ?? null;
}
