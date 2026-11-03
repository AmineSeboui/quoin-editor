import { renderHook, waitFor } from '@testing-library/react';
import type { QuoinBlock } from '../../engine';
import { mountTypingCanvas } from '../typing-test-canvas';
import { useEditorSource } from './use-editor-source';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });

const DOC = [md('a', '# Title'), md('b', 'A paragraph.'), md('c', '- one')];

const mountSource = (blocks: QuoinBlock[] = DOC) => {
  const canvas = mountTypingCanvas(blocks);
  const { result } = renderHook(() => useEditorSource(canvas.handle().controller));
  return { canvas, result };
};

describe('useEditorSource', () => {
  it('gives the markdown the document would be stored as', () => {
    const { result } = mountSource();
    expect(result.current.markdown).toBe('# Title\n\nA paragraph.\n\n- one\n');
  });

  it('follows the document as it is typed into', async () => {
    const { canvas, result } = mountSource();
    canvas.caret('b', 12);
    canvas.type('!');
    await waitFor(() => expect(result.current.markdown).toContain('A paragraph.!'));
  });

  it('marks the lines of the block holding the caret', async () => {
    const { canvas, result } = mountSource();
    canvas.caret('b', 0);
    await waitFor(() => expect(result.current.active).toEqual({ from: 2, to: 2 }));
  });

  it('moves the mark when the caret moves to another block', async () => {
    const { canvas, result } = mountSource();
    canvas.caret('a', 0);
    await waitFor(() => expect(result.current.active).toEqual({ from: 0, to: 0 }));
    canvas.caret('c', 0);
    await waitFor(() => expect(result.current.active).toEqual({ from: 4, to: 4 }));
  });

  it('marks lines that are really the caret block in the markdown it gives', async () => {
    const { canvas, result } = mountSource();
    canvas.caret('c', 0);
    await waitFor(() => expect(result.current.active).toEqual({ from: 4, to: 4 }));
    const { from, to } = result.current.active!;
    expect(result.current.markdown.split('\n').slice(from, to + 1)).toEqual(['- one']);
  });

  // The engine selects the first block of a document that is given no selection, so there is always a marked block.
  it('marks the first block before the caret has been placed anywhere', () => {
    const { result } = mountSource();
    expect(result.current.active).toEqual({ from: 0, to: 0 });
  });

  it('marks nothing for a document with no blocks', () => {
    const { result } = mountSource([]);
    expect(result.current).toEqual({ markdown: '', active: null });
  });
});
