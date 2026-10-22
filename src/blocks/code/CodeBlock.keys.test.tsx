import { act, fireEvent, screen } from '@testing-library/react';
import * as Y from 'yjs';
import { blockRangeSelection, nodeSelection, textSelection } from '../../engine';
import { collaborationExtension } from '../../engine/collab/collaboration-extension';
import type { QuoinBlock } from '../../types';
import { yjsCollaboration } from '../../yjs/index';
import { mountCanvas, paragraph } from '../void/test-canvas';

const code = (id: string, value: string): QuoinBlock => ({ id, type: 'CODE', data: { language: 'ts', code: value } });
const area = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Code' });
const paragraphs = () => screen.getAllByRole('textbox', { name: 'Paragraph' });

function caret(start: number, end = start) {
  act(() => {
    area().focus();
    area().setSelectionRange(start, end);
  });
}

function type(text: string): void {
  for (const data of text) {
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true });
    fireEvent(document.activeElement!, event);
  }
}

const around = (value: string) => [paragraph('a', 'above'), code('k', value), paragraph('b', 'below')];
const at = (block: string, offset: number) => textSelection({ block, region: 'text', offset });

function modifier(canvas: ReturnType<typeof mountCanvas>) {
  return canvas.handle().controller.isMac ? { metaKey: true } : { ctrlKey: true };
}

describe('leaving the code block with the arrows', () => {
  it('goes to the start of the next block on ArrowDown from the last line', () => {
    const { selection } = mountCanvas(around('one\ntwo'));
    caret(5);
    expect(fireEvent.keyDown(area(), { key: 'ArrowDown' })).toBe(false);
    expect(selection()).toEqual(at('b', 0));
    expect(document.activeElement).toBe(paragraphs()[1]);
  });

  it('goes to the end of the previous block on ArrowUp from the first line', () => {
    const { selection } = mountCanvas(around('one\ntwo'));
    caret(1);
    expect(fireEvent.keyDown(area(), { key: 'ArrowUp' })).toBe(false);
    expect(selection()).toEqual(at('a', 5));
    expect(document.activeElement).toBe(paragraphs()[0]);
  });

  it('goes to the end of the previous block on ArrowLeft at its start, and the start of the next on ArrowRight at its end', () => {
    const { selection } = mountCanvas(around('ab'));
    caret(0);
    expect(fireEvent.keyDown(area(), { key: 'ArrowLeft' })).toBe(false);
    expect(selection()).toEqual(at('a', 5));
    caret(2);
    expect(fireEvent.keyDown(area(), { key: 'ArrowRight' })).toBe(false);
    expect(selection()).toEqual(at('b', 0));
    expect(document.activeElement).toBe(paragraphs()[1]);
  });

  it('moves between its own lines in the text area', () => {
    const { selection } = mountCanvas(around('one\ntwo'));
    caret(5);
    expect(fireEvent.keyDown(area(), { key: 'ArrowUp' })).toBe(true);
    expect(selection()).toEqual(nodeSelection('k'));
    expect(document.activeElement).toBe(area());
  });

  it('adds an empty line after a code block that ends the document on ArrowDown, and goes on there', () => {
    const { last, selection } = mountCanvas([paragraph('a', 'above'), code('k', 'x')]);
    caret(1);
    expect(fireEvent.keyDown(area(), { key: 'ArrowDown' })).toBe(false);
    const line = last()[2];
    expect(last()).toEqual([paragraph('a', 'above'), code('k', 'x'), paragraph(line.id, '')]);
    expect(selection()).toEqual(at(line.id, 0));
    expect(document.activeElement).toBe(paragraphs()[1]);
  });

  it('stays in the code on ArrowUp or ArrowRight where no block is there to go to', () => {
    const { selection, changes } = mountCanvas([code('k', 'x')]);
    caret(0);
    expect(fireEvent.keyDown(area(), { key: 'ArrowUp' })).toBe(true);
    caret(1);
    expect(fireEvent.keyDown(area(), { key: 'ArrowRight' })).toBe(true);
    expect(selection()).toEqual(nodeSelection('k'));
    expect(changes).toEqual([]);
    expect(document.activeElement).toBe(area());
  });
});

describe('Backspace in an empty code block', () => {
  it('turns it into an empty paragraph with the caret in it', () => {
    const { last, selection } = mountCanvas([paragraph('a', 'above'), code('k', '')]);
    caret(0);
    expect(fireEvent.keyDown(area(), { key: 'Backspace' })).toBe(false);
    expect(last()).toEqual([paragraph('a', 'above'), paragraph('k', '')]);
    expect(selection()).toEqual(at('k', 0));
    expect(document.activeElement).toBe(paragraphs()[1]);
  });
});

describe('undo and redo in the code', () => {
  it("go to the editor's history, which undoes a session of typing in one step and leaves the caret after it", () => {
    const canvas = mountCanvas(around('let a;'));
    caret(6);
    for (const value of ['let a;\n', 'let a;\nl', 'let a;\nle']) fireEvent.change(area(), { target: { value } });
    expect(fireEvent.keyDown(area(), { key: 'z', ...modifier(canvas) })).toBe(false);
    expect(canvas.last()[1].data.code).toBe('let a;');
    expect(document.activeElement).toBe(area());
    expect(area().selectionStart).toBe(6);
    expect(fireEvent.keyDown(area(), { key: 'Z', code: 'KeyZ', shiftKey: true, ...modifier(canvas) })).toBe(false);
    expect(canvas.last()[1].data.code).toBe('let a;\nle');
    expect(area().selectionStart).toBe(9);
  });

  it.each([
    ['its own history', () => undefined],
    ['a collaboration', () => [collaborationExtension(yjsCollaboration({ doc: new Y.Doc(), user: { name: 'Ada' } }))]],
  ])('leave the caret after the undone text inside the code with %s', (_, extensions) => {
    const canvas = mountCanvas(around('let a;'), { extensions: extensions() });
    caret(2);
    fireEvent.change(area(), { target: { value: 'leXt a;' } });
    fireEvent.keyDown(area(), { key: 'z', ...modifier(canvas) });
    expect(area().value).toBe('let a;');
    expect(area().selectionStart).toBe(2);
    act(() => undefined);
    expect(area().selectionStart).toBe(2);
  });

  it('follow an undo out of the block to the text it changes', () => {
    const canvas = mountCanvas(around('x'));
    act(() => canvas.handle().focus({ block: 'a', region: 'text', offset: 5 }));
    type('!');
    caret(1);
    fireEvent.change(area(), { target: { value: 'xy' } });
    fireEvent.keyDown(area(), { key: 'z', ...modifier(canvas) });
    fireEvent.keyDown(area(), { key: 'z', ...modifier(canvas) });
    expect(canvas.last().map((block) => block.data.markdown ?? block.data.code)).toEqual(['above', 'x', 'below']);
    expect(canvas.selection()).toEqual(at('a', 5));
    expect(document.activeElement).toBe(paragraphs()[0]);
  });
});

describe('Escape in the code', () => {
  it('selects the block, so that Tab next leaves the editor', () => {
    const { selection } = mountCanvas(around('x'));
    caret(1);
    expect(fireEvent.keyDown(area(), { key: 'Escape' })).toBe(false);
    expect(selection()).toEqual(blockRangeSelection('k'));
    expect(document.activeElement).not.toBe(area());
  });
});

describe('a key an input method is composing with', () => {
  it('is left to the input method, so committing a word never adds a line', () => {
    const { changes } = mountCanvas(around('let a;'));
    caret(6);
    expect(fireEvent.keyDown(area(), { key: 'Enter', keyCode: 229 })).toBe(true);
    expect(fireEvent.keyDown(area(), { key: 'Enter', isComposing: true })).toBe(true);
    expect(fireEvent.keyDown(area(), { key: 'Tab', keyCode: 229 })).toBe(true);
    expect(changes).toEqual([]);
  });
});

describe('Mod+A in the code', () => {
  it('is left to the text area until all the code is selected, then selects every block', () => {
    const canvas = mountCanvas(around('ab'));
    caret(1);
    expect(fireEvent.keyDown(area(), { key: 'a', ...modifier(canvas) })).toBe(true);
    caret(0, 2);
    expect(fireEvent.keyDown(area(), { key: 'a', ...modifier(canvas) })).toBe(false);
    expect(canvas.selection()).toEqual(blockRangeSelection('a', 'b'));
  });
});
