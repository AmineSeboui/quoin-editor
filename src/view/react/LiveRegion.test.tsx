import { describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { blockRangeSelection, nodeSelection, textSelection, type QuoinBlock, type Selection } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { handleKeydown } from '../input/keydown';
import { text } from '../../engine/model/inline';
import { replaceInlineStep } from '../../engine/transform/replace-inline-step';
import type { EditorViewProps } from './EditorView';
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

const closed: QuoinBlock[] = [
  md('p', 'before'),
  { id: 'g', type: 'TOGGLE', data: { markdown: 'Summary', open: false } },
  md('c1', 'hidden one', 1),
  md('c2', 'hidden two', 1),
  md('q', 'after'),
];

const dividers: QuoinBlock[] = [md('p', 'text'), { id: 'd1', type: 'DIVIDER', data: {} }, { id: 'd2', type: 'DIVIDER', data: {} }];

function mountWith(initial: QuoinBlock[], view?: Partial<EditorViewProps>) {
  let controller!: ViewController;
  render(<Editor options={{ blocks: initial, onChange: () => {} }} view={view} onController={(c) => (controller = c)} />);
  const select = (selection: Selection) =>
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(selection)));
  return { controller, select, status: () => screen.getByRole('status') };
}

describe('what the live region counts and says', () => {
  it('counts only the blocks it draws, leaving out those a closed toggle hides', () => {
    const { select, status } = mountWith(closed);
    select(blockRangeSelection('p', 'q'));
    expect(status()).toHaveTextContent('3 blocks selected');
    select(textSelection({ block: 'p', region: 'text', offset: 1 }, { block: 'q', region: 'text', offset: 2 }));
    expect(status()).toHaveTextContent('3 blocks selected');
  });

  it('says it again when a node selection moves from one void block to another', () => {
    const { select, status } = mountWith(dividers);
    select(nodeSelection('d1'));
    const first = status().firstElementChild;
    expect(status()).toHaveTextContent('1 block selected');
    select(nodeSelection('d2'));
    expect(status()).toHaveTextContent('1 block selected');
    expect(status().firstElementChild).not.toBe(first);
  });

  it('keeps one announcement while a selection across blocks grows inside the same blocks', () => {
    const { select, status } = mountWith(blocks);
    select(textSelection({ block: 't', region: 'text', offset: 0 }, { block: 'u', region: 'text', offset: 1 }));
    const first = status().firstElementChild;
    select(textSelection({ block: 't', region: 'text', offset: 0 }, { block: 'u', region: 'text', offset: 3 }));
    expect(status().firstElementChild).toBe(first);
  });

  it('words the count with the label the view is given', () => {
    const { select, status } = mountWith(blocks, { blocksSelectedLabel: (n) => `${n} blocs choisis` });
    select(blockRangeSelection('t', 'p'));
    expect(status()).toHaveTextContent('3 blocs choisis');
  });

  it('says what the controller is asked to announce, until the editor moves on', () => {
    const { controller, select, status } = mountWith(blocks);
    act(() => controller.announce('Saved'));
    expect(status()).toHaveTextContent('Saved');
    select(textSelection({ block: 'p', region: 'text', offset: 1 }));
    expect(status()).toBeEmptyDOMElement();
  });

  it('keeps what it said through a collaborator change, until this editor moves on', () => {
    const { controller, select, status } = mountWith(blocks);
    act(() => controller.announce('Saved'));
    const remote = () => controller.editor.createTransaction().setOrigin('remote').setMeta('addToHistory', false);
    act(() => controller.editor.dispatch(remote()));
    act(() => controller.editor.dispatch(remote().step(replaceInlineStep('p', 'text', 0, 0, [text('X')]))));
    expect(status()).toHaveTextContent('Saved');
    select(textSelection({ block: 'p', region: 'text', offset: 1 }));
    expect(status()).toBeEmptyDOMElement();
  });
});
