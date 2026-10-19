import { englishLabels } from '../i18n/english-labels';
import { shortcutHint } from './shortcut-hint';


describe('shortcutHint', () => {
  it('draws the symbols of a Mac and names Command for assistive technology', () => {
    expect(shortcutHint('Mod-d', true, englishLabels)).toEqual({ text: '\u2318D', aria: 'Meta+D' });
    expect(shortcutHint('Mod-Shift-ArrowUp', true, englishLabels)).toEqual({
      text: '\u2318\u21E7\u2191',
      aria: 'Meta+Shift+ArrowUp',
    });
  });

  it('names the modifiers elsewhere, in the words the labels give', () => {
    expect(shortcutHint('Mod-Shift-ArrowDown', false, englishLabels)).toEqual({
      text: 'Ctrl+Shift+\u2193',
      aria: 'Control+Shift+ArrowDown',
    });
    const german = { ...englishLabels, keyNames: { ctrl: 'Strg', alt: 'Alt', shift: 'Umschalt' } };
    expect(shortcutHint('Mod-Alt-1', false, german).text).toBe('Strg+Alt+1');
  });
});
