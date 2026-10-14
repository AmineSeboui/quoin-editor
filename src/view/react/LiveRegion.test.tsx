import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { blockRangeSelection, textSelection } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { handleKeydown } from '../input/keydown';
import { Editor, md } from './test-harness';

const blocks = [md('t', '- [ ] job'), md('u', '- [ ] other'), md('p', 'plain'), { id: 'g', type: 'TOGGLE', data: { markdown: 'Summary', open: true } }];

function mount() {
  let controller!: ViewController;
  render(<Editor options={{ blocks, onChange: () => {} }} onController={(c) => (controller = c)} />);
  const caret = (block: string) =>
    act(() =>
      controller.dispatch(controller.editor.createTransaction().setSelection(textSelection({ block, region: 'text', offset: 1 }))),
    );
  const flip = () =>
    act(() => handleKeydown(controller, new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, cancelable: true })));
  return { controller, caret, flip, status: () => screen.getByRole('status') };
}

describe('the live region', () => {
  it('says what a task became when Mod+Enter flipped it, and lets go once the editor moves on', () => {
    const { caret, flip, status } = mount();
    expect(status()).toBeEmptyDOMElement();
    caret('t');
    flip();
    expect(status()).toHaveTextContent('checked');
    flip();
    expect(status()).toHaveTextContent('unchecked');
    caret('p');
    expect(status()).toBeEmptyDOMElement();
  });

  it('says the same thing again for the next task, after the region has been emptied by the caret moving', () => {
    const { caret, flip, status } = mount();
    const said: (string | null)[] = [];
    caret('t');
    flip();
    said.push(status().textContent);
    caret('u');
    said.push(status().textContent);
    flip();
    said.push(status().textContent);
    expect(said).toEqual(['checked', '', 'checked']);
  });

  it('says expanded and collapsed for a toggle', () => {
    const { caret, flip, status } = mount();
    caret('g');
    flip();
    expect(status()).toHaveTextContent('collapsed');
    flip();
    expect(status()).toHaveTextContent('expanded');
  });

  it('gives way to the announcement of a selection that follows', () => {
    const { controller, caret, flip, status } = mount();
    caret('t');
    flip();
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(blockRangeSelection('t', 'u'))));
    expect(status()).toHaveTextContent('2 blocks selected');
  });
});
