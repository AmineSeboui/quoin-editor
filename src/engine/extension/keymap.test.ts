import { describe, expect, it } from 'vitest';
import { keyName, normalizeKey } from './keymap';

const ev = (key: string, mods: Partial<{ altKey: boolean; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }> = {}, code?: string) => ({
  key,
  code,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...mods,
});

describe('keymaps', () => {
  it('normalizes names per platform', () => {
    expect(normalizeKey('Mod-Shift-z', true)).toBe('Meta-Shift-z');
    expect(normalizeKey('Shift-Mod-Z', false)).toBe('Ctrl-Shift-z');
    expect(normalizeKey('Mod-Alt-1', true)).toBe('Alt-Meta-1');
  });

  it('names events, reading the code when a modifier changed the key', () => {
    expect(keyName(ev('b', { metaKey: true }), true)).toBe('Meta-b');
    expect(keyName(ev('B', { metaKey: true, shiftKey: true }), true)).toBe('Meta-Shift-b');
    expect(keyName(ev('\u00A1', { altKey: true, metaKey: true }, 'Digit1'), true)).toBe('Alt-Meta-1');
    expect(keyName(ev('&', { ctrlKey: true, shiftKey: true }, 'Digit7'), false)).toBe('Ctrl-Shift-7');
    expect(keyName(ev('Enter', { shiftKey: true }), false)).toBe('Shift-Enter');
  });
});
