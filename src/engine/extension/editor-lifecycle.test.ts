import { describe, expect, it, vi } from 'vitest';
import { coreExtensions } from './core-extensions';
import { defineExtension } from './define-extension';
import { md, startEditor } from '../test-support/editor-fixtures';

describe('an extension created and destroyed with its editor', () => {
  it('is handed the editor once it is created, in priority order', () => {
    const order: string[] = [];
    const late = defineExtension({ name: 'late', priority: 10, onCreate: () => void order.push('late') });
    const early = defineExtension({
      name: 'early',
      priority: 500,
      onCreate: (editor) => void order.push(editor.getBlocks()[0].id),
    });
    startEditor([md('a', 'x')], { extensions: [...coreExtensions(), late, early] });
    expect(order).toEqual(['a', 'late']);
  });

  it('runs what it returned once when the editor is destroyed, after the editor stopped taking changes', () => {
    const stop = vi.fn();
    const { editor } = startEditor([md('a', 'x')], {
      extensions: [...coreExtensions(), defineExtension({ name: 'live', onCreate: () => stop })],
    });
    stop.mockImplementation(() => expect(() => editor.dispatch(editor.createTransaction())).toThrow());
    expect(stop).not.toHaveBeenCalled();
    editor.destroy();
    editor.destroy();
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('needs to return nothing', () => {
    const { editor } = startEditor([md('a', 'x')], {
      extensions: [...coreExtensions(), defineExtension({ name: 'quiet', onCreate: () => undefined })],
    });
    expect(() => editor.destroy()).not.toThrow();
  });
});
