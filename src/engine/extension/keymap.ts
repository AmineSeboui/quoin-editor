import type { Command } from '../commands/command';
import type { EditorState } from '../state/editor-state';
import type { Transaction } from '../state/transaction';

export type KeyLike = {
  key: string;
  code?: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

const MODIFIERS = ['Alt', 'Ctrl', 'Meta', 'Shift'] as const;
type Modifier = (typeof MODIFIERS)[number];

const PHYSICAL_KEY = /^(?:Key([A-Z])|Digit([0-9]))$/;
const PLAIN_KEY = /^[a-z0-9]$/;

const lowerSingle = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

const join = (held: ReadonlySet<Modifier>, key: string) => [...MODIFIERS.filter((m) => held.has(m)), key].join('-');

function modifierOf(part: string, isMac: boolean, name: string): Modifier {
  if (part === 'Mod') return isMac ? 'Meta' : 'Ctrl';
  if ((MODIFIERS as readonly string[]).includes(part)) return part as Modifier;
  throw new Error(`unknown modifier "${part}" in key "${name}"`);
}

export function normalizeKey(name: string, isMac: boolean): string {
  const split = name.lastIndexOf('-', name.length - 2);
  if (split < 1) return lowerSingle(name);
  const held = new Set(
    name
      .slice(0, split)
      .split('-')
      .map((part) => modifierOf(part, isMac, name)),
  );
  return join(held, lowerSingle(name.slice(split + 1)));
}

// Shift, and Alt on a Mac, turn a key into another character, so the physical key tells which one was meant.
function eventKey({ key, code, shiftKey, altKey }: KeyLike, isMac: boolean): string {
  const typed = lowerSingle(key ?? 'Unidentified');
  if (!(shiftKey || (isMac && altKey)) || PLAIN_KEY.test(typed)) return typed;
  const physical = code === undefined ? null : PHYSICAL_KEY.exec(code);
  return physical === null ? typed : (physical[1] ?? physical[2]).toLowerCase();
}

export function keyName(event: KeyLike, isMac: boolean): string {
  const held = new Set<Modifier>();
  if (event.altKey) held.add('Alt');
  if (event.ctrlKey) held.add('Ctrl');
  if (event.metaKey) held.add('Meta');
  if (event.shiftKey) held.add('Shift');
  return join(held, eventKey(event, isMac));
}

export function runKeymap(
  keymap: ReadonlyMap<string, readonly Command[]>,
  state: EditorState,
  dispatch: (tr: Transaction) => void,
  event: KeyLike,
  isMac: boolean,
): boolean {
  return (keymap.get(keyName(event, isMac)) ?? []).some((command) => command(state, dispatch));
}
