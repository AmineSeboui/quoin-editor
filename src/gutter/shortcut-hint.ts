import type { ModifierKey } from '../i18n/labels';

const MAC_SYMBOLS: Readonly<Record<string, string>> = { Mod: '\u2318', Ctrl: '\u2303', Alt: '\u2325', Shift: '\u21E7' };
const MODIFIER_KEYS: Readonly<Record<string, ModifierKey>> = { Mod: 'ctrl', Ctrl: 'ctrl', Alt: 'alt', Shift: 'shift' };
const ARIA_MODIFIERS: Readonly<Record<string, string>> = { Ctrl: 'Control', Alt: 'Alt', Shift: 'Shift' };
const ARROWS: Readonly<Record<string, string>> = {
  ArrowUp: '\u2191',
  ArrowDown: '\u2193',
  ArrowLeft: '\u2190',
  ArrowRight: '\u2192',
};

const keyText = (key: string) => ARROWS[key] ?? (key.length === 1 ? key.toUpperCase() : key);

/**
 * A keymap key such as `Mod-Shift-ArrowUp` as the platform writes it, symbols on a Mac and named modifiers elsewhere,
 * and in the form `aria-keyshortcuts` takes.
 */
export function shortcutHint(
  key: string,
  isMac: boolean,
  keyNames: Readonly<Record<ModifierKey, string>>,
): { text: string; aria: string } {
  const modifiers = key.split('-');
  const name = modifiers.pop() ?? key;
  const text = isMac
    ? [...modifiers.map((modifier) => MAC_SYMBOLS[modifier] ?? modifier), keyText(name)].join('')
    : [...modifiers.map((modifier) => keyNames[MODIFIER_KEYS[modifier]] ?? modifier), keyText(name)].join('+');
  const ariaModifier = (modifier: string) => {
    if (modifier === 'Mod') return isMac ? 'Meta' : 'Control';
    return ARIA_MODIFIERS[modifier] ?? modifier;
  };
  const aria = [...modifiers.map(ariaModifier), name.length === 1 ? name.toUpperCase() : name].join('+');
  return { text, aria };
}
