import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { textSelection, type Selection } from '../../engine';
import { readSelection } from '../controller/dom-selection';
import type { ViewController } from '../controller/view-controller';
import { Editor, hostOf, md } from './test-harness';

const at = (block: string, offset: number) => ({ block, region: 'text', offset });

afterEach(() => (document.activeElement as HTMLElement | null)?.blur());

function mount() {
  let controller!: ViewController;
  const blocks = [md('a', 'Alpha beta gamma'), md('b', 'Delta epsilon'), md('c', 'Zeta eta theta')];
  const { container } = render(<Editor options={{ blocks, onChange: () => {} }} onController={(c) => (controller = c)} />);
  const outside = document.createElement('button');
  container.appendChild(outside);
  const select = (selection: Selection) =>
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(selection)));
  const domSelection = () => readSelection(controller.registry, document.getSelection());
  const caretIn = (id: string, offset: number) => document.getSelection()!.collapse(hostOf(container, id).firstChild!, offset);
  // jsdom collapses the selection to the start of whatever it focuses once the focus events have run, which no browser
  // does to a selection already inside, so the DOM selection is read as the events reach the document.
  const focusAndRead = (id: string) => {
    let seen: Selection | null = null;
    document.addEventListener('focusin', () => (seen = domSelection()), { once: true });
    act(() => hostOf(container, id).focus());
    return seen;
  };
  return { controller, container, outside, select, caretIn, focusAndRead };
}

describe('focus that returns to the editor', () => {
  it('finds the model selection when it comes back by keyboard', () => {
    const { controller, outside, select, caretIn, focusAndRead } = mount();
    act(() => controller.focus(at('b', 3)));
    select(textSelection(at('b', 3), at('b', 8)));
    outside.focus();
    caretIn('b', 0);
    expect(focusAndRead('b')).toEqual(textSelection(at('b', 3), at('b', 8)));
  });

  it('finds a selection the model took while focus was away', () => {
    const { controller, outside, select, focusAndRead } = mount();
    act(() => controller.focus(at('a', 2)));
    outside.focus();
    select(textSelection(at('c', 1)));
    expect(focusAndRead('c')).toEqual(textSelection(at('c', 1)));
  });

  it('leaves the caret to a press, which places it once focus has moved', () => {
    const { controller, container, outside, focusAndRead } = mount();
    act(() => controller.focus(at('a', 2)));
    outside.focus();
    const write = vi.spyOn(controller, 'syncSelectionToDom');
    hostOf(container, 'c').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(focusAndRead('c')).toBeNull();
    expect(write).not.toHaveBeenCalled();
  });

  it('forgets a press inside the editor once focus has left it', () => {
    const { controller, container, outside, select, caretIn, focusAndRead } = mount();
    act(() => controller.focus(at('a', 2)));
    hostOf(container, 'a').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    outside.focus();
    select(textSelection(at('c', 1)));
    caretIn('c', 0);
    expect(focusAndRead('c')).toEqual(textSelection(at('c', 1)));
  });
});
