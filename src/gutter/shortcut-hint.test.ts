import { englishLabels } from '../i18n/labels';
import { shortcutHint } from './shortcut-hint';

const { keyNames } = englishLabels;

describe('shortcutHint', () => {
  it('draws the symbols of a Mac and names Command for assistive technology', () => {
    expect(shortcutHint('Mod-d', true, keyNames)).toEqual({ text: '\u2318D', aria: 'Meta+D' });
    expect(shortcutHint('Mod-Shift-ArrowUp', true, keyNames)).toEqual({
      text: '\u2318\u21E7\u2191',
      aria: 'Meta+Shift+ArrowUp',
    });
  });

  it('names the modifiers elsewhere, in the words the labels give', () => {
    expect(shortcutHint('Mod-Shift-ArrowDown', false, keyNames)).toEqual({
      text: 'Ctrl+Shift+\u2193',
      aria: 'Control+Shift+ArrowDown',
    });
    expect(shortcutHint('Mod-Alt-1', false, { ctrl: 'Strg', alt: 'Alt', shift: 'Umschalt' }).text).toBe('Strg+Alt+1');
  });
});
