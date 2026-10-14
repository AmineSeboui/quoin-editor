import { describe, expect, it, vi } from 'vitest';
import { createEditor } from '../../engine/extension/editor';
import { blockRangeSelection, textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { pasteTransfer } from './paste-transfer';
import { QUOIN_SLICE_TYPE, wrapSliceHTML } from './slice-marker';
import { fakeTransfer } from './test-transfer';

const at = (offset: number, block = 'a') => ({ block, region: 'text', offset });

function setup(onFiles?: (files: File[], at: unknown) => void, blocks = ['one', 'two']) {
  const editor = createEditor({
    blocks: blocks.map((markdown, i) => ({ id: 'abc'[i], type: 'MARKDOWN', data: { markdown } })),
  });
  const controller = new ViewController({ editor, onFiles });
  return { editor, controller, markdown: () => editor.getBlocks().map((block) => block.data.markdown) };
}

const slice = (markdown: string) =>
  JSON.stringify({
    quoin: 1,
    slice: { blocks: [{ id: 's', type: 'MARKDOWN', data: { markdown } }], openStart: true, openEnd: true },
  });

describe('pasting a data transfer', () => {
  it('prefers the Quoin JSON flavour over the HTML and the text', () => {
    const { editor, controller, markdown } = setup();
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(3))));
    const flavours = { [QUOIN_SLICE_TYPE]: slice('**J**'), 'text/html': '<p>H</p>', 'text/plain': 'T' };
    pasteTransfer(controller, fakeTransfer(flavours).transfer);
    expect(markdown()).toEqual(['one**J**', 'two']);
  });

  it('reads the slice embedded in the HTML when the custom flavour did not survive', () => {
    const { editor, controller, markdown } = setup();
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(3))));
    const html = wrapSliceHTML('<p>H</p>', slice('**J**'));
    pasteTransfer(controller, fakeTransfer({ 'text/html': html, 'text/plain': 'T' }).transfer);
    expect(markdown()).toEqual(['one**J**', 'two']);
  });

  it('falls back to plain text and replaces a block selection', () => {
    const { editor, controller, markdown } = setup();
    controller.dispatch(editor.createTransaction().setSelection(blockRangeSelection('a', 'b')));
    pasteTransfer(controller, fakeTransfer({ 'text/plain': 'plain' }).transfer);
    expect(markdown()).toEqual(['plain']);
  });

  it('pastes into an empty document, which has no selection', () => {
    const { controller, markdown } = setup(undefined, []);
    const flavours = { 'text/html': '<h2>Head</h2><p>text</p>', 'text/plain': 'Head\ntext' };
    pasteTransfer(controller, fakeTransfer(flavours).transfer);
    expect(markdown()).toEqual(['## Head', 'text']);
  });

  it('turns a lone URL over a selection into a link', () => {
    const { editor, controller, markdown } = setup();
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(0), at(3))));
    pasteTransfer(controller, fakeTransfer({ 'text/plain': 'https://quoin.dev' }).transfer);
    expect(markdown()).toEqual(['[one](https://quoin.dev)', 'two']);
  });

  it('does nothing when the transfer holds nothing it can use', () => {
    const { editor, controller, markdown } = setup();
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(1))));
    const before = editor.state;
    pasteTransfer(controller, fakeTransfer({ 'text/uri-list': 'https://x.y' }).transfer);
    expect(editor.state).toBe(before);
    expect(markdown()).toEqual(['one', 'two']);
  });

  it('hands files with no text or HTML to onFiles with the caret', () => {
    const onFiles = vi.fn();
    const { editor, controller, markdown } = setup(onFiles);
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(2))));
    const file = new File(['x'], 'cat.png', { type: 'image/png' });
    pasteTransfer(controller, fakeTransfer({}, [file]).transfer);
    expect(onFiles).toHaveBeenCalledWith([file], at(2));
    expect(markdown()).toEqual(['one', 'two']);
  });

  it('reports no caret to onFiles when a block is selected', () => {
    const onFiles = vi.fn();
    const { editor, controller } = setup(onFiles);
    controller.dispatch(editor.createTransaction().setSelection(blockRangeSelection('a')));
    const file = new File(['x'], 'cat.png');
    pasteTransfer(controller, fakeTransfer({}, [file]).transfer);
    expect(onFiles).toHaveBeenCalledWith([file], null);
  });

  it('pastes the HTML and ignores the files that come with it', () => {
    const onFiles = vi.fn();
    const { editor, controller, markdown } = setup(onFiles);
    controller.dispatch(editor.createTransaction().setSelection(textSelection(at(3))));
    pasteTransfer(controller, fakeTransfer({ 'text/html': '<p>!</p>' }, [new File(['x'], 'sheet.png')]).transfer);
    expect(onFiles).not.toHaveBeenCalled();
    expect(markdown()).toEqual(['one!', 'two']);
  });

  it('survives files with no onFiles callback', () => {
    const { controller, markdown } = setup();
    pasteTransfer(controller, fakeTransfer({}, [new File(['x'], 'a.png')]).transfer);
    expect(markdown()).toEqual(['one', 'two']);
  });
});
