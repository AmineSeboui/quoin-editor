import { detectMac } from '../engine/extension/detect-mac';
import { englishLabels } from '../i18n/english-labels';
import type { ModifierKey, NamedKey, QuoinLabels } from '../i18n/labels';

/** The words a shortcut is written in: the modifiers away from a Mac, and the keys written out by name. */
export type KeyLabels = Pick<QuoinLabels, 'keyNames' | 'namedKeys'>;

export type ShortcutPlatform = {
  /** Whether to write the keys the way a Mac does. Defaults to the platform the page runs on. */
  isMac?: boolean;
  /** English by default. */
  labels?: KeyLabels;
};

const MODIFIERS: Readonly<Record<string, ModifierKey>> = { mod: 'ctrl', ctrl: 'ctrl', alt: 'alt', shift: 'shift' };
const MAC_SYMBOLS: Readonly<Record<string, string>> = { mod: '\u2318', ctrl: '\u2303', alt: '\u2325', shift: '\u21E7' };
const ARROWS: Readonly<Record<string, string>> = {
  arrowup: '\u2191',
  arrowdown: '\u2193',
  arrowleft: '\u2190',
  arrowright: '\u2192',
};

const capitalized = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

function keyText(key: string, { namedKeys }: KeyLabels): string {
  const name = key.toLowerCase();
  if (Object.hasOwn(namedKeys, name)) return namedKeys[name as NamedKey];
  return ARROWS[name] ?? (key.length === 1 ? key.toUpperCase() : capitalized(key));
}

function modifierText(modifier: string, isMac: boolean, { keyNames }: KeyLabels): string {
  const name = modifier.toLowerCase();
  if (isMac) return MAC_SYMBOLS[name] ?? capitalized(modifier);
  return Object.hasOwn(MODIFIERS, name) ? keyNames[MODIFIERS[name]] : capitalized(modifier);
}

/**
 * Writes a shortcut, in the keymap's form such as `Mod-Shift-b` or as `mod+shift+b`, the way the platform does: the
 * Command and Shift symbols then B on a Mac, and `Ctrl+Shift+B` elsewhere.
 */
export function formatShortcut(shortcut: string, platform: ShortcutPlatform = {}): string {
  const { isMac = detectMac(), labels = englishLabels } = platform;
  const parts = shortcut.split(shortcut.includes('+') ? '+' : '-');
  const key = parts.pop() ?? shortcut;
  const written = [...parts.map((modifier) => modifierText(modifier, isMac, labels)), keyText(key, labels)];
  return written.join(isMac ? '' : '+');
}
