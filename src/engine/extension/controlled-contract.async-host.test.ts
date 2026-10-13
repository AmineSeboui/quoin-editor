import { describe, expect, it, vi } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { caret, md, startEditor } from '../test-support/editor-fixtures';

const table: QuoinBlock = { id: 't', type: 'TABLE', data: { rows: [['a', 'b']], header: true, align: [null, null] } };

describe('an async host that feeds back a JSON copy of every emission', () => {
  it('settles after one round trip with a TABLE in the document', () => {
    const server: QuoinBlock[][] = [];
    const onChange = vi.fn((blocks: QuoinBlock[]) => server.push(JSON.parse(JSON.stringify(blocks))));
    const { editor } = startEditor([table, md('p', 'para')], { onChange });
    editor.commands.setSelection(caret('p', 4));
    editor.insertText('x');
    let reconciles = 0;
    for (let round = 0; round < 10 && server.length > 0; round++) {
      if (editor.setBlocks(server.shift()!)) reconciles++;
    }
    expect(reconciles).toBe(0);
    expect(server).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(editor.can().undo()).toBe(true);
    expect(editor.getBlocks()[1]).toEqual(md('p', 'parax'));
  });
});
