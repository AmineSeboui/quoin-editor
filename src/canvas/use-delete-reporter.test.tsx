import { act, renderHook } from '@testing-library/react';
import { coreExtensions, textSelection, type Pos, type QuoinBlock } from '../engine';
import { createEditor } from '../engine/extension/editor';
import { ViewController } from '../view';
import { useDeleteReporter } from './use-delete-reporter';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
const divider: QuoinBlock = { id: 'd', type: 'DIVIDER', data: {} };
const at = (block: string, offset: number): Pos => ({ block, region: 'text', offset });
const blocksOfHtml = { html: '<p>One</p><p>Two</p>', text: 'One\n\nTwo' };

function reporterOn(blocks: QuoinBlock[]) {
  const editor = createEditor({ blocks, onChange: () => {}, extensions: coreExtensions() });
  const controller = new ViewController({ editor });
  const onDelete = vi.fn<(block: QuoinBlock, index: number) => void>();
  renderHook(() => useDeleteReporter(controller, onDelete));
  const pasteOver = async (anchor: Pos, head: Pos) => {
    editor.dispatch(editor.createTransaction().setSelection(textSelection(anchor, head)));
    await act(async () => void editor.paste(blocksOfHtml));
  };
  const reported = () => onDelete.mock.calls.map(([block, index]) => `${block.id}@${index}`);
  return { editor, pasteOver, reported };
}

describe('the delete reporter, for a paste of blocks over selected text', () => {
  it('reports nothing for the line whose whole text the paste replaces', async () => {
    const blocks = [md('a', 'Title'), md('b', 'First paragraph.'), md('c', 'Next')];
    const { editor, pasteOver, reported } = reporterOn(blocks);
    await pasteOver(at('b', 0), at('b', 16));
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual(['Title', 'One', 'Two', 'Next']);
    expect(reported()).toEqual([]);
  });

  it('reports nothing for the lines a paste from the start of one to the end of the next replaces', async () => {
    const { editor, pasteOver, reported } = reporterOn([md('a', 'Title'), md('b', 'First'), md('c', 'Second')]);
    await pasteOver(at('b', 0), at('c', 6));
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual(['Title', 'One', 'Two']);
    expect(reported()).toEqual([]);
  });

  it('reports nothing for those lines when the selection was made from the end backwards', async () => {
    const { pasteOver, reported } = reporterOn([md('a', 'Title'), md('b', 'First'), md('c', 'Second')]);
    await pasteOver(at('c', 6), at('b', 0));
    expect(reported()).toEqual([]);
  });

  it('still reports a whole block the selected text spanned', async () => {
    const { pasteOver, reported } = reporterOn([md('a', 'one'), divider, md('c', 'three')]);
    await pasteOver(at('a', 1), at('c', 1));
    expect(reported()).toEqual(['d@1']);
  });
});
