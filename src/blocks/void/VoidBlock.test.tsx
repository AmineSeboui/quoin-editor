import { act, fireEvent, screen } from '@testing-library/react';
import { nodeSelection } from '../../engine';
import { resetDevWarnings } from '../../dev-warn';
import type { QuoinBlock, UploadResult } from '../../types';
import type * as UploadFieldModule from '../../upload/UploadField';
import { intrinsicSize, type IntrinsicSize } from '../intrinsic-size';
import { bookmarkBlock, mountCanvas, paragraph } from './test-canvas';

vi.mock('../intrinsic-size');

const picker = vi.hoisted(() => ({
  onUploaded: undefined as ((result: UploadResult) => void | Promise<void>) | undefined,
}));

vi.mock('../../upload/UploadField', async (importOriginal) => {
  const actual = await importOriginal<typeof UploadFieldModule>();
  return {
    UploadField: (props: React.ComponentProps<typeof actual.UploadField>) => {
      picker.onUploaded = props.onUploaded;
      return <actual.UploadField {...props} />;
    },
  };
});

const doc: QuoinBlock[] = [paragraph('a', 'above'), bookmarkBlock('b', 'quoin.dev'), paragraph('c', 'below')];
const urlField = () => screen.queryByRole('textbox', { name: 'Bookmark URL' });

function openBookmark() {
  const canvas = mountCanvas(doc);
  canvas.nodeSelect('b');
  canvas.press('Enter');
  return canvas;
}

beforeEach(() => resetDevWarnings());

describe('VoidBlock', () => {
  it('draws the preview at rest, in a group named after the definition', () => {
    mountCanvas(doc);
    const group = screen.getByRole('group', { name: 'Bookmark' });
    expect(group).toHaveTextContent('Link to quoin.dev');
    expect(group).toHaveAttribute('contenteditable', 'false');
    expect(urlField()).toBeNull();
  });

  it('opens the editor on Enter when the block is node-selected, without inserting a paragraph', () => {
    const { changes, handle } = openBookmark();
    expect(urlField()).toHaveValue('quoin.dev');
    expect(document.activeElement).toBe(urlField());
    expect(changes).toEqual([]);
    expect(handle().editor.getBlocks()).toHaveLength(3);
  });

  it('reports what the editor writes through the canvas onChange, as the data of the block', () => {
    const { last } = openBookmark();
    fireEvent.change(urlField()!, { target: { value: 'quoin.dev/docs' } });
    expect(last()).toEqual([doc[0], bookmarkBlock('b', 'quoin.dev/docs'), doc[2]]);
    expect(urlField()).toHaveValue('quoin.dev/docs');
  });

  it('undoes everything typed in its editor in one step', () => {
    const { handle, last, press, shell } = openBookmark();
    for (const url of ['quoin.dev/', 'quoin.dev/d', 'quoin.dev/do', 'quoin.dev/doc']) {
      fireEvent.change(urlField()!, { target: { value: url } });
    }
    press('Escape', urlField()!);
    const mod = handle().controller.isMac ? { metaKey: true } : { ctrlKey: true };
    act(() => void fireEvent.keyDown(shell('b'), { key: 'z', ...mod }));
    expect(last()).toEqual(doc);
  });

  it('returns to the preview on Escape and leaves the block node-selected with focus', () => {
    const { press, selection, shell } = openBookmark();
    press('Escape', urlField()!);
    expect(urlField()).toBeNull();
    expect(screen.getByText('Link to quoin.dev')).toBeInTheDocument();
    expect(selection()).toEqual(nodeSelection('b'));
    expect(document.activeElement).toBe(shell('b'));
  });

  it('renders the editor of an alwaysEditing block permanently', () => {
    mountCanvas([paragraph('a', 'above'), { id: 'n', type: 'PINNED', data: { note: 'Remember' } }]);
    expect(screen.getByRole('textbox', { name: 'Pinned note text' })).toHaveValue('Remember');
    expect(screen.queryByText('Pinned: Remember')).toBeNull();
  });

  it('draws only previews on a read-only canvas, and warns once for a type with none', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const blocks = [...doc, { id: 'n', type: 'PINNED', data: { note: 'Remember' } }, { id: 's', type: 'SCRATCH', data: { note: 'x' } }];
    const { nodeSelect, press } = mountCanvas(blocks, { readOnly: true });
    nodeSelect('b');
    press('Enter');
    expect(urlField()).toBeNull();
    expect(screen.getByText('Pinned: Remember')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Pinned note text' })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Edit/ })).toBeNull();
    expect(screen.getByRole('group', { name: 'Scratch note' })).toHaveTextContent('Scratch note');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"SCRATCH" has no `preview`');
    warn.mockRestore();
  });

  it('keeps the newest key when an image upload resolves out of order', async () => {
    const pending = new Map<string, (size: IntrinsicSize | null) => void>();
    vi.mocked(intrinsicSize).mockImplementation(
      (src) => new Promise((resolve) => void pending.set(src, resolve)),
    );
    const image: QuoinBlock = { id: 'i', type: 'IMAGE', data: { storageKey: '', alt: '' } };
    const { nodeSelect, press, last } = mountCanvas([image], { resolveAssetUrl: (key) => `/cdn/${key}` });
    nodeSelect('i');
    press('Enter');
    const result = (storageKey: string): UploadResult => ({ storageKey, filename: `${storageKey}.png`, size: 1 });
    let first!: Promise<void>;
    let second!: Promise<void>;
    act(() => {
      first = Promise.resolve(picker.onUploaded!(result('a')));
      second = Promise.resolve(picker.onUploaded!(result('b')));
    });
    expect(last()[0].data).toMatchObject({ storageKey: 'b' });
    pending.get('/cdn/b')!({ width: 20, height: 10 });
    await act(async () => void (await second));
    pending.get('/cdn/a')!({ width: 99, height: 99 });
    await act(async () => void (await first));
    expect(last()[0].data).toMatchObject({ storageKey: 'b', width: 20, height: 10 });
  });
});
