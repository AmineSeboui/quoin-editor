import { describe, expect, it } from 'vitest';
import { createHostRegistry, hostKey } from './host-registry';

describe('host registry', () => {
  it('keys hosts by block and region', () => {
    expect(hostKey('a', 'text')).toBe('a\u0000text');
  });

  it('locates the nearest host around a node', () => {
    const registry = createHostRegistry();
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const text = document.createTextNode('x');
    inner.appendChild(text);
    outer.appendChild(inner);
    registry.register('a', 'text', outer);
    registry.register('b', 'cell', inner);
    expect(registry.locate(text)).toEqual({ block: 'b', region: 'cell', element: inner });
    expect(registry.locate(outer)?.block).toBe('a');
    expect(registry.locate(document.createElement('p'))).toBeNull();
    expect(registry.locate(null)).toBeNull();
  });

  it('lets a newer registration survive the cleanup of the one it replaced', () => {
    const registry = createHostRegistry();
    const first = document.createElement('div');
    const second = document.createElement('div');
    const dropFirst = registry.register('a', 'text', first);
    registry.register('a', 'text', second);
    expect(registry.locate(first)).toBeNull();
    dropFirst();
    expect(registry.get('a', 'text')).toBe(second);
    expect(registry.locate(first)).toBeNull();
    expect([...registry.all()].map((entry) => entry.element)).toEqual([second]);
  });

  it('moves an element registered under a new key', () => {
    const registry = createHostRegistry();
    const element = document.createElement('div');
    const dropOld = registry.register('a', 'text', element);
    registry.register('b', 'text', element);
    expect(registry.get('a', 'text')).toBeUndefined();
    expect([...registry.all()].map((entry) => entry.block)).toEqual(['b']);
    dropOld();
    expect(registry.get('a', 'text')).toBeUndefined();
    expect(registry.locate(element)?.block).toBe('b');
  });
});
