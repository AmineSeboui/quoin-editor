import { describe, expect, it, vi } from 'vitest';
import { buildState } from '../test-support/build-state';
import type { Command } from '../commands/command';
import { key } from '../test-support/editor-fixtures';
import { keyName, normalizeKey, runKeymap } from './keymap';

describe('normalizeKey', () => {
  it('keeps a dash key and lowercases only single letters', () => {
    expect(normalizeKey('-', false)).toBe('-');
    expect(normalizeKey('Mod--', false)).toBe('Ctrl--');
    expect(normalizeKey('Shift-ArrowUp', false)).toBe('Shift-ArrowUp');
    expect(normalizeKey('Mod-Shift-ArrowDown', true)).toBe('Meta-Shift-ArrowDown');
    expect(normalizeKey('Escape', true)).toBe('Escape');
  });

  it('sorts modifiers whatever order they were written in', () => {
    expect(normalizeKey('Shift-Alt-Ctrl-Meta-x', false)).toBe('Alt-Ctrl-Meta-Shift-x');
  });

  it('rejects a modifier it does not know', () => {
    expect(() => normalizeKey('Cmd-b', true)).toThrow(/Cmd/);
  });
});

describe('keyName', () => {
  it('reads the code for Alt on a Mac but not elsewhere, where Alt with Ctrl is AltGr', () => {
    expect(keyName({ ...key('@', { altKey: true, ctrlKey: true }), code: 'KeyQ' }, false)).toBe('Alt-Ctrl-@');
    expect(keyName({ ...key('\u00E5', { altKey: true }), code: 'KeyA' }, true)).toBe('Alt-a');
    expect(keyName({ ...key('\u00E5', { altKey: true }), code: 'KeyA' }, false)).toBe('Alt-\u00E5');
  });

  it('keeps a letter or digit that a layout produced, whatever the physical key', () => {
    expect(keyName({ ...key('C', { ctrlKey: true, shiftKey: true }), code: 'KeyJ' }, false)).toBe('Ctrl-Shift-c');
    expect(keyName({ ...key('1', { shiftKey: true }), code: 'Digit1' }, false)).toBe('Shift-1');
  });

  it('names an event that has no key, as autofill produces', () => {
    expect(keyName({ ...key('x'), key: undefined as unknown as string }, false)).toBe('Unidentified');
  });

  it('names keys without a code and named keys under Shift', () => {
    expect(keyName(key('Dead', { altKey: true }), true)).toBe('Alt-Dead');
    expect(keyName({ ...key('ArrowUp', { shiftKey: true, metaKey: true }), code: 'ArrowUp' }, true)).toBe(
      'Meta-Shift-ArrowUp',
    );
    expect(keyName(key('Tab', { shiftKey: true }), false)).toBe('Shift-Tab');
  });
});

describe('runKeymap', () => {
  const state = buildState(['x']);
  const bound = (name: string, results: boolean[]) => {
    const commands = results.map((result): Command => vi.fn(() => result));
    return { keymap: new Map([[name, commands]]), commands };
  };

  it('runs the commands bound to the key in order and stops at the first that applies', () => {
    const { keymap, commands } = bound('Meta-k', [false, true, true]);
    expect(runKeymap(keymap, state, () => undefined, key('k', { metaKey: true }), true)).toBe(true);
    expect(commands.map((command) => vi.mocked(command).mock.calls.length)).toEqual([1, 1, 0]);
  });

  it('answers false when no command applies or nothing is bound', () => {
    const { keymap } = bound('Meta-k', [false]);
    expect(runKeymap(keymap, state, () => undefined, key('k', { metaKey: true }), true)).toBe(false);
    expect(runKeymap(keymap, state, () => undefined, key('j', { metaKey: true }), true)).toBe(false);
  });

  it('hands the dispatch function to the commands', () => {
    const dispatch = vi.fn();
    const command = vi.fn<Command>((_state, send) => (send?.({} as never), true));
    runKeymap(new Map([['Enter', [command]]]), state, dispatch, key('Enter'), false);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
