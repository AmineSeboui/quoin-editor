import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import type { BlockSpec } from '../schema/types';
import { caret, md, startEditor } from '../test-support/editor-fixtures';
import { coreExtensions } from './core-extensions';
import { defineExtension } from './define-extension';
import type { Editor } from './editor';

const chart: BlockSpec = {
  type: 'CHART',
  flow: 'void',
  fromData: (data) => ({ attrs: { series: data.series }, regions: {} }),
  toData: ({ attrs }) => ({ series: attrs.series }),
  initial: () => ({ attrs: { series: [] }, regions: {} }),
};

describe('a host that echoes a structured clone synchronously from onChange', () => {
  it('recognises the clone of a custom block with array data and keeps the text', () => {
    let changes = 0;
    const blocks: QuoinBlock[] = [{ id: 'c', type: 'CHART', data: { series: [1, 2, 3] } }, md('p', 'para')];
    const editor: Editor = startEditor(blocks, {
      extensions: [...coreExtensions(), defineExtension({ name: 'chart', blocks: [chart] })],
      onChange: (emitted) => {
        changes++;
        expect(editor.setBlocks(structuredClone(emitted))).toBe(false);
      },
    }).editor;
    editor.commands.setSelection(caret('p', 4));
    expect(() => editor.insertText('x')).not.toThrow();
    expect(changes).toBe(1);
    expect(editor.getBlocks()).toEqual([blocks[0], md('p', 'parax')]);
    expect(editor.can().undo()).toBe(true);
  });
});
