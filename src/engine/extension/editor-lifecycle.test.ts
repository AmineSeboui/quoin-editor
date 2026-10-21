import { describe, expect, it, vi } from 'vitest';
import { coreExtensions } from './core-extensions';
import { defineExtension } from './define-extension';
import { md, startEditor } from '../test-support/editor-fixtures';

const mountedWith = (onMount: () => (() => void) | void) =>
  startEditor([md('a', 'x')], { extensions: [...coreExtensions(), defineExtension({ name: 'live', onMount })] });

describe('an extension mounted with its editor', () => {
  it('is handed the editor on each mount, in priority order, and not on creation', () => {
    const order: string[] = [];
    const late = defineExtension({ name: 'late', priority: 10, onMount: () => void order.push('late') });
    const early = defineExtension({
      name: 'early',
      priority: 500,
      onMount: (editor) => void order.push(editor.getBlocks()[0].id),
    });
    const { editor } = startEditor([md('a', 'x')], { extensions: [...coreExtensions(), late, early] });
    expect(order).toEqual([]);
    editor.mount();
    expect(order).toEqual(['a', 'late']);
  });

  it('runs what it returned once when that mount ends', () => {
    const stop = vi.fn();
    const { editor } = mountedWith(() => stop);
    const unmount = editor.mount();
    unmount();
    unmount();
    expect(stop).toHaveBeenCalledTimes(1);
    editor.destroy();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('ends each mount on its own, so mounting again after an unmount leaves one live', () => {
    const live = new Set<number>();
    let next = 0;
    const { editor } = mountedWith(() => {
      const id = ++next;
      live.add(id);
      return () => void live.delete(id);
    });
    const first = editor.mount();
    first();
    const second = editor.mount();
    expect([...live]).toEqual([2]);
    second();
    expect(live.size).toBe(0);
  });

  it('ends every live mount when the editor is destroyed, after it stopped taking changes', () => {
    const stop = vi.fn();
    const { editor } = mountedWith(() => stop);
    stop.mockImplementation(() => expect(() => editor.dispatch(editor.createTransaction())).toThrow());
    editor.mount();
    editor.mount();
    editor.destroy();
    editor.destroy();
    expect(stop).toHaveBeenCalledTimes(2);
  });

  it('ends what earlier extensions mounted when a later one throws, and throws its error', () => {
    const stop = vi.fn();
    const early = defineExtension({ name: 'early', priority: 500, onMount: () => stop });
    const failing = defineExtension({
      name: 'failing',
      priority: 10,
      onMount: () => {
        throw new Error('broken');
      },
    });
    const { editor } = startEditor([md('a', 'x')], { extensions: [...coreExtensions(), early, failing] });
    expect(() => editor.mount()).toThrow('broken');
    expect(stop).toHaveBeenCalledTimes(1);
    editor.destroy();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('mounts nothing on a destroyed editor', () => {
    const onMount = vi.fn();
    const { editor } = mountedWith(onMount);
    editor.destroy();
    editor.mount()();
    expect(onMount).not.toHaveBeenCalled();
  });

  it('needs to return nothing', () => {
    const { editor } = mountedWith(() => undefined);
    expect(() => editor.mount()()).not.toThrow();
  });
});
