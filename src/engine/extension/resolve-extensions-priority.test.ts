import { describe, expect, it } from 'vitest';
import type { Command } from '../commands/command';
import type { BlockSpec } from '../schema/types';
import { coreExtensions } from './core-extensions';
import { defineExtension } from './define-extension';
import { resolveExtensions } from './resolve-extensions';

const tableSpec = (tag: string): BlockSpec => ({
  type: 'TABLE',
  flow: 'void',
  fromData: () => ({ attrs: { tag }, regions: {} }),
  toData: () => ({}),
  initial: () => ({ attrs: { tag }, regions: {} }),
});

const tagOf = (spec: BlockSpec | undefined) => spec?.initial().attrs.tag;
const mark = (): Command => () => true;

function overriding(name: string, priority?: number) {
  const key = mark();
  const factory = () => mark();
  return {
    key,
    factory,
    extension: defineExtension({
      name,
      priority,
      blocks: [tableSpec(name)],
      keymap: { 'Mod-b': key },
      commands: { toggleMark: factory },
    }),
  };
}

function winners(resolved: ReturnType<typeof resolveExtensions>) {
  return {
    block: tagOf(resolved.schema.blocks.get('TABLE')),
    key: resolved.keymap.get('Ctrl-b')?.[0],
    command: resolved.commands.toggleMark,
  };
}

describe('extension priority', () => {
  it('lets one extension at a higher priority than core win the block, the key and the command', () => {
    const { extension, key, factory } = overriding('custom', 200);
    const resolved = resolveExtensions([...coreExtensions(), extension], false);
    expect(winners(resolved)).toEqual({ block: 'custom', key, command: factory });
  });

  it('lets core win all three over an extension at a lower priority', () => {
    const { extension, key, factory } = overriding('custom', 50);
    const resolved = resolveExtensions([...coreExtensions(), extension], false);
    const result = winners(resolved);
    expect(result.block).toBeUndefined();
    expect(result.key).not.toBe(key);
    expect(result.command).not.toBe(factory);
  });

  it('gives the same winners whatever the order the extensions are given in', () => {
    const { extension, key, factory } = overriding('custom', 200);
    const resolved = resolveExtensions([extension, ...coreExtensions()], false);
    expect(winners(resolved)).toEqual({ block: 'custom', key, command: factory });
  });

  it('keeps today\u2019s winners for two extensions at the default priority', () => {
    const first = overriding('first');
    const second = overriding('second');
    const resolved = resolveExtensions([first.extension, second.extension], false);
    expect(winners(resolved)).toEqual({ block: 'second', key: first.key, command: first.factory });
    expect(resolved.keymap.get('Ctrl-b')).toEqual([first.key, second.key]);
  });
});
