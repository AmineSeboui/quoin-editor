import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { textSelection, type Selection } from '../../engine';
import type { ViewController } from '../controller/view-controller';
import { Editor, hostOf, md } from '../react/test-harness';

const at = (block: string, offset: number) => ({ block, region: 'text', offset });
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});

function mount() {
  let controller!: ViewController;
  const blocks = [md('a', 'hello'), md('b', 'mid'), md('c', 'world')];
  const { container } = render(<Editor options={{ blocks, onChange: () => {} }} onController={(c) => (controller = c)} />);
  const root = container.querySelector<HTMLElement>('.quoin-editor')!;
  const sink = container.querySelector<HTMLElement>('[data-quoin-sink]')!;
  const select = (selection: Selection) =>
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(selection)));
  const painted = () => Array.from(container.querySelectorAll('.quoin-selected'), (span) => span.textContent);
  const markdown = () => controller.editor.getBlocks().map((block) => block.data.markdown);
  return { controller, container, root, sink, select, painted, markdown };
}

function crossSelected() {
  const view = mount();
  act(() => view.controller.focus(at('a', 1)));
  view.select(textSelection(at('a', 2), at('c', 3)));
  return view;
}

describe('cross mode', () => {
  it('moves focus and the native selection into the sink, which holds the selected text', () => {
    const { root, sink, container } = crossSelected();
    expect(root).toHaveAttribute('data-quoin-cross', '');
    expect(document.activeElement).toBe(sink);
    expect(sink.textContent).toBe('llo\nmid\nwor');
    expect(sink.contains(document.getSelection()!.anchorNode)).toBe(true);
    expect(sink).toHaveAttribute('tabindex', '0');
    expect(container.querySelector('[role="status"]')).toHaveTextContent('3 blocks selected');
  });

  it('keeps the sink text and its selection in step as the selection changes', () => {
    const { sink, select } = crossSelected();
    document.getSelection()!.removeAllRanges();
    select(textSelection(at('a', 2), at('b', 3)));
    expect(sink.textContent).toBe('llo\nmid');
    expect(document.getSelection()!.toString()).toBe('llo\nmid');
  });

  it('paints the covered ranges as decorations without the highlight API', () => {
    expect(crossSelected().painted()).toEqual(['llo', 'mid', 'wor']);
  });

  it('writes a selection inside one host back natively and empties the sink', () => {
    const { root, sink, container, select, painted } = crossSelected();
    select(textSelection(at('c', 1)));
    expect(root).not.toHaveAttribute('data-quoin-cross');
    expect(sink.textContent).toBe('');
    expect(painted()).toEqual([]);
    expect(document.activeElement).toBe(hostOf(container, 'c'));
    expect(document.getSelection()!.anchorOffset).toBe(1);
    expect(hostOf(container, 'c').contains(document.getSelection()!.anchorNode)).toBe(true);
  });

  it('paints but leaves focus alone while a control outside the editor has it', () => {
    const { root, select, painted } = mount();
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();
    select(textSelection(at('a', 2), at('c', 3)));
    expect(root).toHaveAttribute('data-quoin-cross', '');
    expect(painted()).toEqual(['llo', 'mid', 'wor']);
    expect(document.activeElement).toBe(button);
  });

  it('paints a selection dispatched straight on the editor once the hosts have rendered', async () => {
    const { controller, root } = mount();
    const { editor } = controller;
    act(() => editor.dispatch(editor.createTransaction().setSelection(textSelection(at('a', 2), at('c', 3)))));
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    expect(root).toHaveAttribute('data-quoin-cross', '');
  });

  it('replaces the selection with text typed into the sink', () => {
    const { sink, markdown } = crossSelected();
    const event = new InputEvent('beforeinput', { inputType: 'insertText', data: 'X', bubbles: true, cancelable: true });
    act(() => void sink.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(markdown()).toEqual(['heXld']);
  });

  it('runs keys pressed in the sink on the model selection', () => {
    const { sink, markdown } = crossSelected();
    act(() => void sink.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true })));
    expect(markdown()).toEqual(['held']);
  });

  it('commits a composition in the sink once it ends, then empties the sink', async () => {
    const { sink, markdown } = crossSelected();
    sink.textContent = '\u65e5\u672c';
    sink.dispatchEvent(new CompositionEvent('compositionend', { data: '\u65e5\u672c', bubbles: true }));
    await act(nextTask);
    expect(markdown()).toEqual(['he\u65e5\u672cld']);
    expect(sink.textContent).toBe('');
  });
});
