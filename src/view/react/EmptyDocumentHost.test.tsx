import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { blockRangeSelection } from '../../engine';
import { deleteSelection } from '../../engine/commands/delete-commands';
import type { ViewController } from '../controller/view-controller';
import { hostOf, md, Stateful } from './test-harness';

const three = [md('a', 'one'), md('b', 'two'), md('c', 'three')];

function mount(blocks = three) {
  let controller!: ViewController;
  const onChange = vi.fn();
  const { container } = render(<Stateful blocks={blocks} options={{ onChange }} onController={(c) => (controller = c)} />);
  const markdown = () => controller.editor.getBlocks().map((block) => block.data.markdown);
  const emptyHost = () => screen.getByRole('textbox', { name: 'Paragraph' });
  const tabStops = () => Array.from(container.querySelectorAll('[tabindex="0"]'));
  const emptyEverything = () => {
    act(() => hostOf(container, 'a').focus());
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(blockRangeSelection('a', 'c'))));
    act(() => void controller.run(deleteSelection));
  };
  return { controller: () => controller, container, onChange, markdown, emptyHost, tabStops, emptyEverything };
}

const keydown = (key: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true, ...init });
const beforeInput = (inputType: string, data: string | null = null) =>
  new InputEvent('beforeinput', { inputType, data, cancelable: true, bubbles: true });
const press = (target: Element, event: Event) => act(() => void target.dispatchEvent(event));

describe('EmptyDocumentHost focus', () => {
  it('takes the focus and the only tab stop when an edit empties the document', () => {
    const { markdown, emptyHost, tabStops, emptyEverything } = mount();
    emptyEverything();
    expect(markdown()).toEqual([]);
    expect(document.activeElement).toBe(emptyHost());
    expect(tabStops()).toEqual([emptyHost()]);
  });

  it('is the tab stop of a document that starts empty, and takes the focus the controller gives it', () => {
    const { controller, emptyHost, tabStops } = mount([]);
    expect(tabStops()).toEqual([emptyHost()]);
    act(() => controller().focus());
    expect(document.activeElement).toBe(emptyHost());
  });
});

describe('EmptyDocumentHost keys', () => {
  it('runs the keymap, so Mod+Z brings back what emptied the document and Mod+Shift+Z empties it again', () => {
    const { container, markdown, emptyHost, emptyEverything } = mount();
    emptyEverything();
    const undo = keydown('z', { ctrlKey: true });
    press(emptyHost(), undo);
    expect(undo.defaultPrevented).toBe(true);
    expect(markdown()).toEqual(['one', 'two', 'three']);
    expect(container.contains(document.activeElement)).toBe(true);
    press(document.activeElement!, keydown('z', { ctrlKey: true, shiftKey: true }));
    expect(markdown()).toEqual([]);
    expect(document.activeElement).toBe(emptyHost());
  });

  it('handles historyUndo from the browser', () => {
    const { markdown, emptyHost, emptyEverything } = mount();
    emptyEverything();
    const undo = beforeInput('historyUndo');
    press(emptyHost(), undo);
    expect(undo.defaultPrevented).toBe(true);
    expect(markdown()).toEqual(['one', 'two', 'three']);
  });

  it('handles historyRedo from the browser once an undo has emptied the document', () => {
    const { markdown, emptyHost } = mount([]);
    act(() => emptyHost().focus());
    press(emptyHost(), beforeInput('insertText', 'a'));
    press(document.activeElement!, keydown('z', { ctrlKey: true }));
    expect(markdown()).toEqual([]);
    expect(document.activeElement).toBe(emptyHost());
    const redo = beforeInput('historyRedo');
    press(emptyHost(), redo);
    expect(redo.defaultPrevented).toBe(true);
    expect(markdown()).toEqual(['a']);
  });

  it('leaves the model and the host alone on Enter, Backspace and Delete', () => {
    const { markdown, emptyHost, onChange } = mount([]);
    const host = emptyHost();
    act(() => host.focus());
    const inputs = ['insertParagraph', 'deleteContentBackward', 'deleteContentForward'].map((type) => beforeInput(type));
    inputs.forEach((event) => press(host, event));
    expect(inputs.map((event) => event.defaultPrevented)).toEqual([true, true, true]);
    expect(markdown()).toEqual([]);
    expect(onChange).not.toHaveBeenCalled();
    expect(host.innerHTML).toBe('<br data-quoin-filler="">');
    expect(document.activeElement).toBe(host);
  });

  it('starts the document with a line break on Shift+Enter, as the keymap does without a selection', () => {
    const { controller, container, markdown, emptyHost } = mount([]);
    act(() => emptyHost().focus());
    const shiftEnter = keydown('Enter', { shiftKey: true });
    press(emptyHost(), shiftEnter);
    expect(shiftEnter.defaultPrevented).toBe(true);
    expect(markdown()).toEqual(['<br>']);
    expect(document.activeElement).toBe(hostOf(container, controller().editor.state.doc.blocks[0].id));
  });
});
