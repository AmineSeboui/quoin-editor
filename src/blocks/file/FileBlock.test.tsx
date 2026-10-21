import { act, fireEvent, screen, within } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { nodeSelection, textSelection } from '../../engine';
import type { QuoinBlock } from '../../types';
import { mountCanvas, paragraph } from '../void/test-canvas';

const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const file = (data: Record<string, unknown> = {}, id = 'f'): QuoinBlock => ({
  id,
  type: 'FILE',
  data: { storageKey: 'notes.pdf', filename: 'notes.pdf', size: 1536, mime: 'application/pdf', ...data },
});
const card = () => screen.getByRole('group', { name: 'File' });
const link = () => within(card()).queryByRole('link');

describe('a file block holding a file', () => {
  it('is a card with the name and size of the file and a link that downloads it from the address the host gives', () => {
    mountCanvas([file()], { resolveAssetUrl });
    expect(card()).toHaveTextContent('notes.pdf');
    expect(card()).toHaveTextContent('1.5 KB');
    const download = within(card()).getByRole('link', { name: 'Download notes.pdf' });
    expect(download).toHaveTextContent('Download');
    expect(download).toHaveAttribute('href', '/cdn/notes.pdf');
    expect(download).toHaveAttribute('download', 'notes.pdf');
    expect(download).toHaveAttribute('target', '_blank');
    expect(download).toHaveAttribute('rel', 'noopener');
  });

  it.each(['https://cdn.quoin.dev/notes.pdf', 'blob:https://quoin.dev/1f2e', 'data:application/pdf;base64,JVBERg==', '/files/notes.pdf'])(
    'links the http, https, blob, data or relative address the host gives, here %s',
    (address) => {
      mountCanvas([file()], { resolveAssetUrl: () => address });
      expect(link()).toHaveAttribute('href', address);
    },
  );

  it('shows an icon for the type of the file, and no size for a file that has none', () => {
    mountCanvas([file({ size: undefined, mime: undefined, filename: 'backup.zip' })], { resolveAssetUrl });
    expect(card().querySelector('svg.lucide-file-archive')).not.toBeNull();
    expect(card()).toHaveTextContent(/^backup\.zipDownload$/);
  });

  it('draws the card without a link, and goes on drawing the canvas, when the host cannot resolve its key', () => {
    const broken = () => {
      throw new Error('no such key');
    };
    mountCanvas([paragraph('a', 'above'), file()], { resolveAssetUrl: broken });
    expect(card()).toHaveTextContent('notes.pdf');
    expect(link()).toBeNull();
    expect(screen.getByRole('textbox', { name: 'Paragraph' })).toHaveTextContent('above');
  });

  it.each([
    ['the host gives no address for its key', {}, () => ''],
    ['it has a name but no key', { storageKey: '' }, resolveAssetUrl],
    ['its key resolves to a script', { storageKey: ' JaVa\tScript:alert(1)' }, String],
    ['its key resolves to another script', { storageKey: 'vbscript:msgbox(1)' }, String],
    ['its key resolves to a local file', { storageKey: 'file:///etc/passwd' }, String],
    ['its key resolves to another application', { storageKey: 'ms-word:ofe|u|https://x.y/a.doc' }, String],
  ])('draws the card without a link when %s', (_case, data, resolve) => {
    mountCanvas([file(data)], { resolveAssetUrl: resolve });
    expect(card()).toHaveTextContent('notes.pdf');
    expect(link()).toBeNull();
  });

  it('is selected as a whole by the arrows and by a click on the card', () => {
    const { handle, press, selection, sink } = mountCanvas([paragraph('a', 'above'), file(), paragraph('b', 'below')], {
      resolveAssetUrl,
    });
    act(() => handle().focus({ block: 'a', region: 'text', offset: 5 }));
    press('ArrowRight');
    expect(selection()).toEqual(nodeSelection('f'));
    act(() => handle().focus({ block: 'b', region: 'text', offset: 0 }));
    fireEvent.click(within(card()).getByText('notes.pdf'));
    expect(selection()).toEqual(nodeSelection('f'));
    expect(sink()).toHaveFocus();
  });

  it('keeps the block when a key is typed on it, and goes on in a new line under it on Enter', () => {
    const { nodeSelect, press, last, selection } = mountCanvas([file()], { resolveAssetUrl });
    nodeSelect('f');
    press('x');
    expect(last()).toBeUndefined();
    press('Enter');
    expect(last().map((block) => block.type)).toEqual(['FILE', 'MARKDOWN']);
    expect(selection()).toEqual(textSelection({ block: last()[1].id, region: 'text', offset: 0 }));
  });

  it('leaves its link out of the tab order of an editable canvas, and goes back to the block on Escape from it', () => {
    const { selection, sink } = mountCanvas([file()], { resolveAssetUrl });
    const download = link()!;
    expect(download).toHaveAttribute('tabindex', '-1');
    act(() => download.focus());
    fireEvent.keyDown(download, { key: 'Escape', isComposing: true });
    fireEvent.keyDown(download, { key: 'Escape', keyCode: 229 });
    expect(download).toHaveFocus();
    fireEvent.keyDown(download, { key: 'Escape' });
    expect(selection()).toEqual(nodeSelection('f'));
    expect(sink()).toHaveFocus();
  });

  it('offers only its link on a read-only canvas, in the tab order, and says an empty block has no file', () => {
    mountCanvas([file(), file({ storageKey: '', filename: '' }, 'e')], { resolveAssetUrl, readOnly: true });
    const [download] = screen.getAllByRole('link');
    expect(download).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByLabelText('Upload file')).toBeNull();
    expect(screen.getByText('No file chosen')).toBeInTheDocument();
  });

  it.each([false, true])('has no accessibility violations, with a file and without, read-only: %s', async (readOnly) => {
    const { container } = mountCanvas([file(), file({ storageKey: '', filename: '' }, 'e')], {
      resolveAssetUrl,
      readOnly,
      upload: async () => ({ storageKey: 'k', filename: 'k.pdf', size: 1 }),
    });
    expect(await axe(container)).toHaveNoViolations();
  });
});
