import { afterEach, describe, expect, it, vi } from 'vitest';
import { englishLabels } from '../i18n/english-labels';
import { formatShortcut } from './format-shortcut';

const german = {
  keyNames: { ctrl: 'Strg', alt: 'Alt', shift: 'Umschalt' },
  namedKeys: { ...englishLabels.namedKeys, escape: 'Esc', enter: 'Eingabe', delete: 'Entf' },
};

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
    expect(formatShortcut('Mod-Shift-z', { isMac: false, labels: german })).toBe('Strg+Umschalt+Z');
    expect(formatShortcut('Mod-Shift-z', { isMac: true, labels: german })).toBe('\u2318\u21E7Z');
  });

  it('names the keys it writes out in the words it is given, on every platform', () => {
    expect(formatShortcut('Shift-Enter', { isMac: false, labels: german })).toBe('Umschalt+Eingabe');
    expect(formatShortcut('Shift-Enter', { isMac: true, labels: german })).toBe('\u21E7Eingabe');
    expect(formatShortcut('Escape', { isMac: true, labels: german })).toBe('Esc');
    expect(formatShortcut('Delete', { isMac: false, labels: german })).toBe('Entf');
  });

  it('names those keys in English without labels', () => {
    const named = ['Escape', 'Tab', 'Enter', 'Space', 'Backspace', 'Delete', 'F10'];
    expect(named.map((key) => formatShortcut(key, { isMac: false }))).toEqual(named);
    expect(formatShortcut('mod+enter', { isMac: false })).toBe('Ctrl+Enter');
  });
});
