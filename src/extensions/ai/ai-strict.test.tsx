import { StrictMode, createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { textSelection } from '../../engine';
import { aiExtension } from './ai-extension';
import { fakeAiHost, nextFrame } from './ai-test-host';

describe('AI actions under StrictMode', () => {
  it('ask the host once, stream once and accept once', async () => {
    const host = fakeAiHost();
    const extensions = [aiExtension({ stream: host.stream })];
    const ref = createRef<QuoinEditorHandle>();
    const blocks = [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'one two' } }];
    render(
      <StrictMode>
        <BlockCanvas ref={ref} blocks={blocks} onChange={() => {}} extensions={extensions} />
      </StrictMode>,
    );
    const { controller } = ref.current!;
    const [from, to] = [4, 7].map((offset) => ({ block: 'a', region: 'text', offset }));
    act(() => ref.current!.focus());
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(from, to))));
    const ui = extensions[0].ui as { bubbleItems: { run(controller: unknown): void }[] };
    act(() => ui.bubbleItems[0].run(controller));
    act(() => void fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fix' } }));
    act(() => void fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' }));
    host.last().push('three');
    host.last().end();
    await act(nextFrame);
    expect(host.stream).toHaveBeenCalledTimes(1);
    expect(host.last().signal.aborted).toBe(false);
    act(() => void fireEvent.click(screen.getByRole('button', { name: 'Accept' })));
    expect(controller.editor.getBlocks()[0].data.markdown).toBe('one three');
  });
});
