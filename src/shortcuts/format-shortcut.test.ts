import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatShortcut } from './format-shortcut';

function platform(value: string) {
  vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue(value);
}

afterEach(() => vi.restoreAllMocks());

describe('formatShortcut', () => {
  it('uses the mac symbols with no separator', () => {
    platform('MacIntel');
    expect(formatShortcut('mod+alt+2')).toBe('\u2318\u23252');
    expect(formatShortcut('mod+shift+8')).toBe('\u2318\u21E78');
  });

  it('uses spelled out modifiers elsewhere', () => {
    platform('Win32');
    expect(formatShortcut('mod+alt+2')).toBe('Ctrl+Alt+2');
  });

  it('upper cases a letter key', () => {
    platform('Win32');
    expect(formatShortcut('mod+b')).toBe('Ctrl+B');
  });

  it('reads the keymap form, draws the arrows and names the other keys', () => {
    expect(formatShortcut('Mod-Shift-ArrowUp', { isMac: true })).toBe('\u2318\u21E7\u2191');
    expect(formatShortcut('Mod-Shift-ArrowDown', { isMac: false })).toBe('Ctrl+Shift+\u2193');
    expect(formatShortcut('Shift-Enter', { isMac: false })).toBe('Shift+Enter');
    expect(formatShortcut('Mod-Shift-/', { isMac: false })).toBe('Ctrl+Shift+/');
    expect(formatShortcut('Alt-F10', { isMac: true })).toBe('\u2325F10');
    expect(formatShortcut('escape', { isMac: true })).toBe('Escape');
    expect(formatShortcut('/', { isMac: true })).toBe('/');
  });

  it('names the modifiers away from a Mac in the words it is given', () => {
    const keyNames = { ctrl: 'Strg', alt: 'Alt', shift: 'Umschalt' };
    expect(formatShortcut('Mod-Shift-z', { isMac: false, keyNames })).toBe('Strg+Umschalt+Z');
    expect(formatShortcut('Mod-Shift-z', { isMac: true, keyNames })).toBe('\u2318\u21E7Z');
  });
});
