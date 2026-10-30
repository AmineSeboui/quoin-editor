import { describe, expect, it } from 'vitest';
import type { Command } from '../commands/command';
import type { InputRule } from '../rules/input-rule';
import { createPluginKey, type PluginSpec } from '../state/plugin';
import { defineExtension } from './define-extension';
import { resolveExtensions } from './resolve-extensions';
import type { PasteRule } from './types';

const rule = (name: string): InputRule => ({ name, match: /x$/, handler: () => null });
const paste = (name: string): PasteRule => ({ name, match: () => null });
const plugin = (name: string): PluginSpec<number> => ({
  key: createPluginKey<number>(name),
  init: () => 0,
  apply: (_tr, value) => value,
});
const command: Command = () => true;

describe('resolveExtensions details', () => {
  it('keeps the given order between extensions of equal priority', () => {
    const names = ['c', 'a', 'b'].map((name) => defineExtension({ name }));
    expect(resolveExtensions(names, false).extensions.map((e) => e.name)).toEqual(['c', 'a', 'b']);
  });

  it('does not reorder the array it was given', () => {
    const given = [defineExtension({ name: 'low', priority: 1 }), defineExtension({ name: 'high', priority: 9 })];
    resolveExtensions(given, false);
    expect(given.map((e) => e.name)).toEqual(['low', 'high']);
  });

  it('concatenates rules and plugins in priority order', () => {
    const a = defineExtension({
      name: 'a',
      inputRules: [rule('a1'), rule('a2')],
      pasteRules: [paste('a')],
      plugins: [plugin('pa')],
    });
    const b = defineExtension({
      name: 'b',
      priority: 300,
      inputRules: [rule('b1')],
      pasteRules: [paste('b')],
      plugins: [plugin('pb')],
    });
    const resolved = resolveExtensions([a, b], false);
    expect(resolved.inputRules.map((r) => r.name)).toEqual(['b1', 'a1', 'a2']);
    expect(resolved.pasteRules.map((r) => r.name)).toEqual(['b', 'a']);
    expect(resolved.plugins.map((p) => p.key.name)).toEqual(['pb', 'pa']);
  });

  it('merges commands with the first definition winning', () => {
    const one = () => command;
    const two = () => command;
    const a = defineExtension({ name: 'a', commands: { same: one, onlyA: one } });
    const b = defineExtension({ name: 'b', priority: 300, commands: { same: two, onlyB: two } });
    const { commands } = resolveExtensions([a, b], false);
    expect(Object.keys(commands).sort()).toEqual(['onlyA', 'onlyB', 'same']);
    expect(commands.same).toBe(two);
  });

  it('lets the extension with the higher priority override a block spec by type', () => {
    const spec = (flow: 'text' | 'void') => ({
      type: 'DIVIDER',
      flow,
      fromData: () => ({ attrs: {}, regions: {} }),
      toData: () => ({}),
      initial: () => ({ attrs: {}, regions: {} }),
    });
    const core = defineExtension({ name: 'core', blocks: [spec('void')] });
    const override = defineExtension({ name: 'override', priority: 150, blocks: [spec('text')] });
    expect(resolveExtensions([override, core], false).schema.blocks.get('DIVIDER')?.flow).toBe('text');
    expect(resolveExtensions([core, override], false).schema.blocks.get('DIVIDER')?.flow).toBe('text');
  });

  it('keeps the core schema when no extension adds to it', () => {
    const { schema } = resolveExtensions([], false);
    expect(schema.blocks.has('MARKDOWN')).toBe(true);
    expect(schema.marks.has('bold')).toBe(true);
    expect(schema.atoms.has('mention')).toBe(true);
    expect(schema.defaultTextBlock).toBe('MARKDOWN');
  });

  it('maps every spelling of a key to one entry and rejects a bad modifier', () => {
    const a = defineExtension({ name: 'a', keymap: { 'Mod-Shift-K': command, 'Shift-Mod-k': command } });
    expect(resolveExtensions([a], true).keymap.get('Meta-Shift-k')).toHaveLength(2);
    const bad = defineExtension({ name: 'bad', keymap: { 'Hyper-k': command } });
    expect(() => resolveExtensions([bad], true)).toThrow(/Hyper/);
  });

  it('collects no decorations when no extension adds any', () => {
    expect(resolveExtensions([], false).decorations({} as never)).toEqual([]);
  });
});
