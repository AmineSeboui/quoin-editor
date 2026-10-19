import { act, fireEvent, screen } from '@testing-library/react';
import { nodeSelection } from '../../engine';
import { bookmarkBlock, mountCanvas, paragraph } from './test-canvas';

const doc = [paragraph('a', 'above'), bookmarkBlock('b', 'quoin.dev'), paragraph('c', 'below')];
const urlField = () => screen.queryByRole('textbox', { name: 'Bookmark URL' });

function openBookmark() {
  const canvas = mountCanvas(doc);
  canvas.nodeSelect('b');
  canvas.press('Enter');
  expect(document.activeElement).toBe(urlField());
  return canvas;
}

describe('VoidBlock editing ends', () => {
  it('when focus moves to another element, leaving the selection to whatever took it', () => {
    const { handle, selection } = openBookmark();
    act(() => handle().focus({ block: 'c', region: 'text', offset: 1 }));
    expect(urlField()).toBeNull();
    expect(selection()).toMatchObject({ kind: 'text', head: { block: 'c', offset: 1 } });
  });

  it('when the pointer goes down outside the block', () => {
    const { selection } = openBookmark();
    fireEvent.pointerDown(document.body);
    expect(urlField()).toBeNull();
    expect(selection()).toEqual(nodeSelection('b'));
  });

  it('not when focus goes nowhere, as when the window loses it or a focused control is disabled', () => {
    openBookmark();
    fireEvent.blur(urlField()!, { relatedTarget: null });
    expect(urlField()).not.toBeNull();
    fireEvent.blur(urlField()!, { relatedTarget: document.body });
    expect(urlField()).toBeNull();
  });

  it('not when the pointer goes down inside the editor or in an overlay it opened', () => {
    openBookmark();
    fireEvent.pointerDown(urlField()!);
    const overlay = document.body.appendChild(document.createElement('div'));
    overlay.setAttribute('data-radix-popper-content-wrapper', '');
    fireEvent.pointerDown(overlay);
    expect(urlField()).not.toBeNull();
    overlay.remove();
  });

  it('when the editor calls onDone, leaving the block node-selected with focus', () => {
    const { selection, shell } = openBookmark();
    const done = screen.getByRole('button', { name: 'Done' });
    act(() => done.focus());
    fireEvent.click(done);
    expect(urlField()).toBeNull();
    expect(selection()).toEqual(nodeSelection('b'));
    expect(document.activeElement).toBe(shell('b'));
  });

  it('when the editor inserts a block after its own, whose editor opens with focus', () => {
    const { last, selection, shell } = openBookmark();
    fireEvent.click(screen.getByRole('button', { name: 'Add bookmark' }));
    const blocks = last();
    expect(blocks.map((block) => block.id).slice(0, 2)).toEqual(['a', 'b']);
    expect(blocks[2]).toMatchObject({ type: 'BOOKMARK', data: { url: 'new.example' } });
    expect(blocks[3]).toEqual(doc[2]);
    expect(selection()).toEqual(nodeSelection(blocks[2].id));
    expect(screen.getAllByRole('textbox', { name: 'Bookmark URL' })).toHaveLength(1);
    expect(document.activeElement).toBe(urlField());
    expect(shell(blocks[2].id).contains(urlField())).toBe(true);
  });

  it('when the editor inserts a text block after its own, which takes the caret and focus', () => {
    const { last, selection, shell } = openBookmark();
    fireEvent.click(screen.getByRole('button', { name: 'Add paragraph' }));
    expect(urlField()).toBeNull();
    const added = last()[2];
    expect(added).toEqual({ id: added.id, type: 'MARKDOWN', data: { markdown: '' } });
    expect(selection()).toMatchObject({ kind: 'text', head: { block: added.id, offset: 0 } });
    expect(document.activeElement).toBe(shell(added.id).querySelector('[data-quoin-host]'));
  });

  it('when the canvas turns read-only, and stays ended once it is editable again', () => {
    const { handle } = openBookmark();
    act(() => handle().controller.setReadOnly(true));
    expect(urlField()).toBeNull();
    act(() => handle().controller.setReadOnly(false));
    expect(urlField()).toBeNull();
  });
});
