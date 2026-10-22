import { StrictMode, createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { QuoinEditorHandle } from '../../canvas/canvas-props';
import { textSelection, type QuoinBlock } from '../../engine';
import { createCommentThreads } from './comment-threads';
import { commentsExtension } from './comments-extension';

describe('comments under StrictMode', () => {
  it('ask the host once, mark the text once and open the new thread for its first comment', async () => {
    const threads = createCommentThreads();
    const onCreate = vi.fn(() => {
      threads.set([{ id: 't1', resolved: false, comments: [] }]);
      return Promise.resolve('t1');
    });
    const extensions = [
      commentsExtension({
        threads,
        currentUser: { id: 'me', name: 'Grace Hopper' },
        onCreate,
        onReply: () => Promise.resolve(),
        onResolve: () => Promise.resolve(),
        onDelete: () => Promise.resolve(),
      }),
    ];
    const ref = createRef<QuoinEditorHandle>();
    const changes: QuoinBlock[][] = [];
    function Host() {
      const [blocks, setBlocks] = useState<QuoinBlock[]>([
        { id: 'a', type: 'MARKDOWN', data: { markdown: 'one two' } },
      ]);
      const onChange = (next: QuoinBlock[]) => {
        changes.push(next);
        setBlocks(next);
      };
      return <BlockCanvas ref={ref} blocks={blocks} onChange={onChange} extensions={extensions} />;
    }
    render(
      <StrictMode>
        <Host />
      </StrictMode>,
    );
    const { controller } = ref.current!;
    const [from, to] = [4, 7].map((offset) => ({ block: 'a', region: 'text', offset }));
    act(() => ref.current!.focus());
    act(() => controller.dispatch(controller.editor.createTransaction().setSelection(textSelection(from, to))));
    const mod = controller.isMac ? { metaKey: true } : { ctrlKey: true };
    act(() => void fireEvent.keyDown(document.activeElement!, { key: 'm', code: 'KeyM', altKey: true, ...mod }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(changes.map((blocks) => blocks[0].data.markdown)).toEqual(['one <span data-comment="t1">two</span>']);
    expect(document.activeElement).toBe(screen.getByRole('textbox', { name: 'Add a comment' }));
  });
});
