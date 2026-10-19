import type { ModifierKey } from '../i18n/labels';
import { formatShortcut } from '../shortcuts/format-shortcut';

const ARIA_MODIFIERS: Readonly<Record<string, string>> = { Ctrl: 'Control', Alt: 'Alt', Shift: 'Shift' };

export function shortcutHint(
  key: string,
  isMac: boolean,
  keyNames: Readonly<Record<ModifierKey, string>>,
): { text: string; aria: string } {
  const modifiers = key.split('-');
  const name = modifiers.pop() ?? key;
  // aria-keyshortcuts names modifiers by their DOM key values, Control and Meta, whatever the hint shows.
  const ariaModifier = (modifier: string) => {
    if (modifier === 'Mod') return isMac ? 'Meta' : 'Control';
    return ARIA_MODIFIERS[modifier] ?? modifier;
  };
  const aria = [...modifiers.map(ariaModifier), name.length === 1 ? name.toUpperCase() : name].join('+');
  return { text: formatShortcut(key, { isMac, keyNames }), aria };
}
