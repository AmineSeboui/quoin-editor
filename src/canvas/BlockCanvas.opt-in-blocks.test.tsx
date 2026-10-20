import { act, screen } from '@testing-library/react';
import { fromMarkdown, nodeSelection, textSelection, type QuoinBlock } from '../engine';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';

const table: QuoinBlock = {
  id: 't',
  type: 'TABLE',
  data: { rows: [['Name', 'Size'], ['a', '**2**']], header: true, align: [null, 'right'], widths: [160, 80] },
};
const doc = (above = 'Above', below = 'Below') => [paragraph('a', above), structuredClone(table), paragraph('b', below)];
const dataOf = (blocks: QuoinBlock[]) => blocks.find((block) => block.type === 'TABLE')?.data;
const strip = ({ widths: _widths, ...rest }: Record<string, unknown>) => rest;

describe.each([false, true])('a block of an opt-in feature on a canvas without its extension, read-only %s', (readOnly) => {
  it('is drawn as an unsupported block that shows none of its content', () => {
    const { shell } = mountCanvas(doc(), { readOnly });
    expect(shell('t')).toContainElement(screen.getByRole('group', { name: 'Unsupported block' }));
    expect(shell('t')).not.toHaveTextContent('Name');
    expect(shell('t').querySelector('[data-quoin-host]')).toBeNull();
  });

  it('round-trips its data and its markdown unchanged', () => {
    const { changes, handle } = mountCanvas(doc(), { readOnly });
    expect(changes).toEqual([]);
    const { editor } = handle();
    expect(editor.getBlocks()[1]).toEqual(table);
    expect(dataOf(fromMarkdown(editor.toMarkdown({ lossless: true })))).toEqual(table.data);
    expect(dataOf(fromMarkdown(editor.toMarkdown()))).toEqual(strip(table.data));
  });
});

describe('a block of an opt-in feature on an editable canvas without its extension', () => {
  it('is never rewritten by an edit elsewhere', () => {
    const { changes, handle, last } = mountCanvas(doc());
    act(() => handle().focus({ block: 'b', region: 'text', offset: 5 }));
    act(() => void handle().editor.insertText('!'));
    expect(changes).toHaveLength(1);
    expect(last()[1]).toEqual(table);
    expect(last()[2]).toEqual(paragraph('b', 'Below!'));
  });

  it('is selected whole by the arrows from either side, and passed over to the next line', () => {
    const { handle, press, selection } = mountCanvas(doc('', ''));
    act(() => handle().focus({ block: 'a', region: 'text', offset: 0 }));
    press('ArrowDown');
    expect(selection()).toEqual(nodeSelection('t'));
    press('ArrowDown');
    expect(selection()).toEqual(textSelection({ block: 'b', region: 'text', offset: 0 }));
    press('ArrowUp');
    expect(selection()).toEqual(nodeSelection('t'));
  });

  it('is deleted whole once selected, and comes back unchanged with undo', () => {
    const { handle, nodeSelect, press, last } = mountCanvas(doc());
    nodeSelect('t');
    press('Backspace');
    expect(last().map((block) => block.id)).toEqual(['a', 'b']);
    act(() => void handle().editor.commands.undo());
    expect(last()[1]).toEqual(table);
  });
});
