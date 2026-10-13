import { describe, expect, it } from 'vitest';
import { defineExtension } from './define-extension';
import { resolveExtensions } from './resolve-extensions';
import { coreExtensions } from './core-extensions';

describe('resolveExtensions', () => {
  it('orders by priority and collects commands per key', () => {
    const calls: string[] = [];
    const a = defineExtension({ name: 'a', priority: 50, keymap: { 'Mod-k': () => (calls.push('a'), false) } });
    const b = defineExtension({ name: 'b', priority: 200, keymap: { 'Mod-k': () => (calls.push('b'), true) } });
    const resolved = resolveExtensions([a, b], true);
    expect(resolved.extensions.map((e) => e.name)).toEqual(['b', 'a']);
    expect(resolved.keymap.get('Meta-k')).toHaveLength(2);
  });

  it('builds the core schema and keymap', () => {
    const resolved = resolveExtensions(coreExtensions(), false);
    expect(resolved.schema.blocks.has('TABLE')).toBe(true);
    expect(resolved.keymap.has('Ctrl-z')).toBe(true);
    expect(resolved.keymap.has('Ctrl-Alt-2')).toBe(false);
    expect(resolved.keymap.has('Alt-Ctrl-2')).toBe(true);
    expect(resolved.inputRules.length).toBeGreaterThan(10);
  });

  it('requires a name', () => {
    expect(() => defineExtension({ name: '' })).toThrow(/name/);
  });
});
