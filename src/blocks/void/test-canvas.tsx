import { createRef, useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Bookmark, StickyNote } from 'lucide-react';
import { BlockCanvas } from '../../canvas/BlockCanvas';
import type { BlockCanvasProps, QuoinEditorHandle } from '../../canvas/canvas-props';
import { nodeSelection } from '../../engine';
import { defineBlock } from '../../registry';
import type { BlockEditorProps, QuoinBlock } from '../../types';
import { coreBlocks } from '../core';

type BookmarkData = { url: string };

function BookmarkEditor({ data, onChange, onInsertBlock, onDone }: BlockEditorProps<BookmarkData>) {
  return (
    <div>
      <input aria-label="Bookmark URL" value={data.url} onChange={(event) => onChange({ url: event.target.value })} />
      <button type="button" onClick={() => onInsertBlock?.('BOOKMARK')}>
        Add bookmark
      </button>
      <button type="button" onClick={() => onInsertBlock?.('MARKDOWN')}>
        Add paragraph
      </button>
      <button type="button" onClick={onDone}>
        Done
      </button>
    </div>
  );
}

export const bookmark = defineBlock<BookmarkData>({
  type: 'BOOKMARK',
  label: 'Bookmark',
  icon: Bookmark,
  editor: BookmarkEditor,
  preview: ({ data }) => <p>Link to {data.url}</p>,
  initialData: () => ({ url: 'new.example' }),
});

export const pinnedNote = defineBlock<{ note: string }>({
  type: 'PINNED',
  label: 'Pinned note',
  icon: StickyNote,
  alwaysEditing: true,
  editor: ({ data, onChange }) => (
    <textarea aria-label="Pinned note text" value={data.note} onChange={(event) => onChange({ note: event.target.value })} />
  ),
  preview: ({ data }) => <p>Pinned: {data.note}</p>,
});

export const scratch = defineBlock<{ note: string }>({
  type: 'SCRATCH',
  label: 'Scratch note',
  icon: StickyNote,
  editor: ({ data }) => <textarea aria-label="Scratch" defaultValue={data.note} />,
});

export const linkPreview = defineBlock<{ url: string }>({
  type: 'LINK_PREVIEW',
  label: 'Link preview',
  icon: Bookmark,
  preview: ({ data }) => <p>Preview of {data.url}</p>,
});

export const testBlockTypes = [...coreBlocks, bookmark, pinnedNote, scratch, linkPreview];

export const paragraph = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
export const bookmarkBlock = (id: string, url: string): QuoinBlock => ({ id, type: 'BOOKMARK', data: { url } });

type Props = Partial<Omit<BlockCanvasProps, 'blocks' | 'onChange'>>;

export function mountCanvas(initial: QuoinBlock[], props: Props = {}) {
  const changes: QuoinBlock[][] = [];
  const ref = createRef<QuoinEditorHandle>();
  function Host() {
    const [blocks, setBlocks] = useState(initial);
    return (
      <BlockCanvas
        ref={ref}
        blocks={blocks}
        onChange={(next) => {
          changes.push(next);
          setBlocks(next);
        }}
        blockTypes={testBlockTypes}
        {...props}
      />
    );
  }
  const { container } = render(<Host />);
  const handle = () => ref.current!;
  const shell = (id: string) => container.querySelector<HTMLElement>(`[data-block-id="${id}"]`)!;
  const sink = () => container.querySelector<HTMLElement>('[data-quoin-sink]')!;
  const nodeSelect = (id: string) =>
    act(() => {
      const { controller } = handle();
      controller.dispatch(controller.editor.createTransaction().setSelection(nodeSelection(id)));
      handle().focus();
    });
  const press = (key: string, target: Element = document.activeElement ?? document.body) =>
    act(() => void fireEvent.keyDown(target, { key }));
  const selection = () => handle().editor.state.selection;
  const last = () => changes[changes.length - 1];
  const openBlockMenu = () => {
    const mod = handle().controller.isMac ? { metaKey: true } : { ctrlKey: true };
    act(() => void fireEvent.keyDown(document.activeElement ?? document.body, { key: '/', ...mod }));
    return screen.getByRole('menu');
  };
  return { changes, container, handle, shell, sink, nodeSelect, press, selection, last, openBlockMenu };
}
