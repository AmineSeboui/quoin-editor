import { describe, expect, it } from 'vitest';
import { act, render } from '@testing-library/react';
import type { EditorState } from '../../engine';
import { createEditor } from '../../engine/extension/editor';
import { insertText } from '../../engine/commands/insert-text';
import { textSelection } from '../../engine/state/selection';
import { ViewController } from '../controller/view-controller';
import { useEditorState } from './use-editor-state';

function setup() {
  const editor = createEditor({
    blocks: [
      { id: 'a', type: 'MARKDOWN', data: { markdown: 'one' } },
      { id: 'b', type: 'MARKDOWN', data: { markdown: 'two' } },
    ],
  });
  return { editor, controller: new ViewController({ editor }) };
}

function Probe<T>({
  controller,
  selector,
  isEqual,
  seen,
}: {
  controller: ViewController;
  selector: (state: EditorState) => T;
  isEqual?: (a: T, b: T) => boolean;
  seen: { renders: number; value?: T };
}) {
  const value = useEditorState(controller, selector, isEqual);
  seen.renders += 1;
  seen.value = value;
  return null;
}

const count = (state: EditorState) => state.doc.blocks.length;
const at = (block: string, offset: number) => ({ block, region: 'text', offset });

describe('useEditorState', () => {
  it('re-renders only when the selected value changes', () => {
    const { editor, controller } = setup();
    const seen: { renders: number; value?: number } = { renders: 0 };
    render(<Probe controller={controller} selector={count} seen={seen} />);
    const initial = seen.renders;
    act(() => controller.run(insertText('x')));
    act(() => controller.dispatch(editor.createTransaction().setSelection(textSelection(at('b', 1)))));
    expect(seen.renders).toBe(initial);
    act(() => void editor.setBlocks([{ id: 'a', type: 'MARKDOWN', data: { markdown: 'one' } }]));
    expect(seen.value).toBe(1);
    expect(seen.renders).toBe(initial + 1);
  });

  it('reads the current state on the first render', () => {
    const { controller } = setup();
    const seen: { renders: number; value?: number } = { renders: 0 };
    render(<Probe controller={controller} selector={count} seen={seen} />);
    expect(seen.value).toBe(2);
  });

  it('keeps the previous value when the comparison says the new one is equal', () => {
    const { controller } = setup();
    const seen: { renders: number; value?: { n: number } } = { renders: 0 };
    const selector = (state: EditorState) => ({ n: state.doc.blocks.length });
    render(<Probe controller={controller} selector={selector} isEqual={(a, b) => a.n === b.n} seen={seen} />);
    const first = seen.value;
    const initial = seen.renders;
    act(() => controller.run(insertText('x')));
    expect(seen.value).toBe(first);
    expect(seen.renders).toBe(initial);
  });

  it('follows a selector that changes between renders', () => {
    const { controller } = setup();
    const seen: { renders: number; value?: string } = { renders: 0 };
    const { rerender } = render(
      <Probe controller={controller} selector={(state) => state.doc.blocks[0].id} seen={seen} />,
    );
    expect(seen.value).toBe('a');
    rerender(<Probe controller={controller} selector={(state) => state.doc.blocks[1].id} seen={seen} />);
    expect(seen.value).toBe('b');
  });

  it('stops listening to a controller it no longer reads', () => {
    const first = setup();
    const second = setup();
    const seen: { renders: number; value?: number } = { renders: 0 };
    const { rerender } = render(<Probe controller={first.controller} selector={count} seen={seen} />);
    rerender(<Probe controller={second.controller} selector={count} seen={seen} />);
    const settled = seen.renders;
    act(() => void first.editor.setBlocks([]));
    expect(seen.renders).toBe(settled);
    act(() => void second.editor.setBlocks([]));
    expect(seen.value).toBe(0);
  });
});
