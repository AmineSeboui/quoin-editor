import { act } from '@testing-library/react';
import { textSelection, type QuoinBlock } from '../../engine';
import { cellKey } from '../../engine/blocks/table-spec';
import { mountCanvas, paragraph } from '../../blocks/void/test-canvas';
import { QUOIN_SLICE_TYPE } from '../../view/clipboard/slice-marker';
import { clipboardEvent, fakeTransfer } from '../../view/clipboard/test-transfer';
import { tableExtension } from './table-extension';

const ROWS = [
  ['a', 'b', 'c'],
  ['d', 'e', 'f'],
];

const table: QuoinBlock = { id: 't', type: 'TABLE', data: { rows: ROWS, header: true, align: [null, null, null] } };

const at = (row: number, col: number, offset = 0) => ({ block: 't', region: cellKey(row, col), offset });

function mount() {
  const mounted = mountCanvas([paragraph('p', ''), table, paragraph('q', '')], { extensions: [tableExtension()] });
  const select = (anchor: ReturnType<typeof at>, head = anchor) =>
    act(() => {
      const { controller } = mounted.handle();
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(anchor, head)));
      controller.focus();
    });
  const rows = () => mounted.handle().editor.getBlocks()[1].data.rows;
  const types = () => mounted.handle().editor.getBlocks().map((block) => block.type);
  return { ...mounted, select, rows, types };
}

const fire = (type: 'copy' | 'cut' | 'paste', transfer: DataTransfer) =>
  act(() => void document.activeElement!.dispatchEvent(clipboardEvent(type, transfer)));

describe('the clipboard over a cell range', () => {
  it('copies the cells of the range alone: a table of them as rich content, their text separated by tabs', () => {
    const { select } = mount();
    select(at(0, 1), at(1, 2));
    const { transfer, store } = fakeTransfer();
    fire('copy', transfer);
    expect(store.get('text/plain')).toBe('b\tc\ne\tf');
    expect(store.get('text/html')).toContain('<table><thead><tr><th>b</th><th>c</th></tr></thead><tbody><tr><td>e</td><td>f</td></tr></tbody></table>');
    expect(JSON.parse(store.get(QUOIN_SLICE_TYPE)!).slice.blocks[0].data.rows).toEqual([['b', 'c'], ['e', 'f']]);
  });

  it('cuts the cells of the range and nothing else, as one step of history', () => {
    const { select, rows, handle } = mount();
    select(at(0, 1), at(1, 0));
    const { transfer, store } = fakeTransfer();
    fire('cut', transfer);
    expect(store.get('text/plain')).toBe('a\tb\nd\te');
    expect(rows()).toEqual([['', '', 'c'], ['', '', 'f']]);
    act(() => void handle().editor.commands.undo());
    expect(rows()).toEqual(ROWS);
  });

  it('puts cut cells back where they were on a paste right after, and adds nothing else', () => {
    const { select, rows, types } = mount();
    select(at(1, 1), at(0, 0));
    const { transfer } = fakeTransfer();
    fire('cut', transfer);
    fire('paste', transfer);
    expect(rows()).toEqual(ROWS);
    expect(types()).toEqual(['MARKDOWN', 'TABLE', 'MARKDOWN']);
  });

  it('pastes copied cells from the first cell of a range, adding the rows they reach past', () => {
    const { select, rows } = mount();
    select(at(0, 0), at(1, 1));
    const { transfer } = fakeTransfer();
    fire('copy', transfer);
    select(at(1, 2), at(1, 1));
    fire('paste', transfer);
    expect(rows()).toEqual([['a', 'b', 'c'], ['d', 'a', 'b'], ['', 'd', 'e']]);
  });

  it('pastes copied cells outside a table as a table of their own', () => {
    const { select, handle } = mount();
    select(at(0, 1), at(1, 1));
    const { transfer } = fakeTransfer();
    fire('copy', transfer);
    act(() => handle().focus({ block: 'q', region: 'text', offset: 0 }));
    fire('paste', transfer);
    const pasted = handle().editor.getBlocks()[2];
    expect(pasted).toMatchObject({ type: 'TABLE', data: { rows: [['b'], ['e']], header: true } });
  });

  it('pastes rich text over the range into its first cell, keeping its formatting', () => {
    const { select, rows } = mount();
    select(at(1, 2), at(0, 1));
    const { transfer } = fakeTransfer({ 'text/plain': 'x y', 'text/html': '<p><b>x</b> y</p>' });
    fire('paste', transfer);
    expect(rows()).toEqual([['a', '**x** y', ''], ['d', '', '']]);
  });

  it('pastes text over the range into its first cell', () => {
    const { select, rows } = mount();
    select(at(1, 2), at(0, 1));
    const { transfer } = fakeTransfer({ 'text/plain': 'x\r\ny' });
    fire('paste', transfer);
    expect(rows()).toEqual([['a', 'x<br>y', ''], ['d', '', '']]);
  });
});
