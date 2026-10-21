import { afterEach, describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import { useState } from 'react';
import { textSelection } from '../../engine/state/selection';
import type { QuoinBlock } from '../../engine/model/quoin-block';
import { readSelection } from '../controller/dom-selection';
import type { ViewController } from '../controller/view-controller';
import { Editor, hostOf, md } from './test-harness';

type SetBlocks = (update: (blocks: QuoinBlock[]) => QuoinBlock[]) => void;

const three = [md('a', 'Alpha beta gamma'), md('b', 'Delta epsilon'), md('c', 'Zeta eta theta')];
const at = (block: string, offset: number) => ({ block, region: 'text', offset });

afterEach(() => (document.activeElement as HTMLElement | null)?.blur());

function mount(blocks: QuoinBlock[] = three) {
  let controller!: ViewController;
  let setBlocks!: SetBlocks;
  function Host() {
    const [current, setCurrent] = useState(blocks);
    setBlocks = setCurrent;
    return <Editor options={{ blocks: current, onChange: setCurrent }} onController={(c) => (controller = c)} />;
  }
  const view = render(<Host />);
  const rewrite = (id: string, markdown: (old: string) => string) =>
    act(() =>
      setBlocks((current) =>
        current.map((block) => (block.id === id ? { ...block, data: { markdown: markdown(String(block.data.markdown)) } } : block)),
      ),
    );
  const load = (next: QuoinBlock[]) => act(() => setBlocks(() => next));
  const domSelection = () => readSelection(controller.registry, document.getSelection());
  return { ...view, controller, rewrite, load, domSelection };
}

describe('changes the controller did not make', () => {
  it('keeps the DOM caret on the model caret when the host rewrites the caret block', () => {
    const { controller, container, rewrite, domSelection } = mount();
    act(() => controller.focus(at('b', 8)));
    rewrite('b', (old) => `${old} and more`);
    expect(controller.editor.state.selection).toEqual(textSelection(at('b', 8)));
    expect(domSelection()).toEqual(textSelection(at('b', 8)));
    rewrite('b', (old) => `XX${old}`);
    expect(controller.editor.state.selection).toEqual(textSelection(at('b', 10)));
    expect(domSelection()).toEqual(textSelection(at('b', 10)));
    expect(document.activeElement).toBe(hostOf(container, 'b'));
  });

  it('writes a selection set by an editor command outside the controller', () => {
    const { controller, domSelection } = mount();
    act(() => controller.focus(at('a', 1)));
    act(() => void controller.editor.commands.setSelection(textSelection(at('c', 2), at('c', 4))));
    expect(domSelection()).toEqual(textSelection(at('c', 2), at('c', 4)));
    act(() => void controller.editor.chain().setSelection(textSelection(at('c', 1))).insertText('Q').run());
    expect(domSelection()).toEqual(textSelection(at('c', 2)));
  });

  it('moves focus into the new host when the host changes the kind of the caret block', () => {
    const { controller, container, rewrite, domSelection } = mount();
    act(() => controller.focus(at('b', 3)));
    const before = hostOf(container, 'b');
    rewrite('b', (old) => `## ${old}`);
    expect(hostOf(container, 'b')).not.toBe(before);
    expect(document.activeElement).toBe(hostOf(container, 'b'));
    expect(domSelection()).toEqual(controller.editor.state.selection);
  });

  it('moves focus to where the selection lands in a document the host loads', () => {
    const { controller, container, load, domSelection } = mount();
    act(() => controller.focus(at('b', 3)));
    load([md('x', 'Other one'), md('y', '## Other heading')]);
    const head = (controller.editor.state.selection as { head: { block: string } }).head.block;
    expect(document.activeElement).toBe(hostOf(container, head));
    expect(domSelection()).toEqual(controller.editor.state.selection);
    load([]);
    expect(document.activeElement).toBe(controller.emptyHost);
  });

  it('keeps the selection sink in step with a change inside a selection across blocks, and leaves it on a collapse', () => {
    const { controller, container, rewrite } = mount();
    act(() => controller.focus(at('a', 1)));
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(at('a', 6), at('c', 4)))));
    const sink = controller.sink!;
    expect(document.activeElement).toBe(sink);
    rewrite('b', () => 'Changed');
    expect(sink.textContent).toBe('beta gamma\nChanged\nZeta');
    act(() => void controller.editor.commands.setSelection(textSelection(at('c', 2))));
    expect(document.activeElement).toBe(hostOf(container, 'c'));
    expect(readSelection(controller.registry, document.getSelection())).toEqual(textSelection(at('c', 2)));
  });

  it('leaves focus and the DOM selection alone while a control outside the editor has focus', () => {
    const { controller, container, rewrite } = mount();
    act(() => controller.focus(at('b', 8)));
    const button = document.createElement('button');
    container.appendChild(button);
    button.focus();
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    rewrite('b', (old) => `## ${old}`);
    expect(document.activeElement).toBe(button);
    expect(selection.rangeCount).toBe(0);
  });
});
