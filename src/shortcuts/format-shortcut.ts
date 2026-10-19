import { detectMac } from '../engine/extension/detect-mac';
import { englishLabels, type ModifierKey } from '../i18n/labels';

export type ShortcutPlatform = {
  /** Whether to write the keys the way a Mac does. Defaults to the platform the page runs on. */
  isMac?: boolean;
  /** The names of the modifier keys away from a Mac, English by default. */
  keyNames?: Readonly<Record<ModifierKey, string>>;
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

const keyText = (key: string) => ARROWS[key.toLowerCase()] ?? (key.length === 1 ? key.toUpperCase() : capitalized(key));

function modifierText(modifier: string, isMac: boolean, keyNames: Readonly<Record<ModifierKey, string>>): string {
  const name = modifier.toLowerCase();
  if (isMac) return MAC_SYMBOLS[name] ?? capitalized(modifier);
  return Object.hasOwn(MODIFIERS, name) ? keyNames[MODIFIERS[name]] : capitalized(modifier);
}

/**
 * Writes a shortcut, in the keymap's form such as `Mod-Shift-b` or as `mod+shift+b`, the way the platform does: the
 * Command and Shift symbols then B on a Mac, and `Ctrl+Shift+B` elsewhere.
 */
export function formatShortcut(shortcut: string, platform: ShortcutPlatform = {}): string {
  const { isMac = detectMac(), keyNames = englishLabels.keyNames } = platform;
  const parts = shortcut.split(shortcut.includes('+') ? '+' : '-');
  const key = parts.pop() ?? shortcut;
  const written = [...parts.map((modifier) => modifierText(modifier, isMac, keyNames)), keyText(key)];
  return written.join(isMac ? '' : '+');
}
