import { act, fireEvent, waitFor } from '@testing-library/react';
import { intrinsicSize } from '../blocks/intrinsic-size';
import { mountCanvas, paragraph } from '../blocks/void/test-canvas';
import type { QuoinBlock, UploadFn } from '../types';

vi.mock('../blocks/intrinsic-size');

beforeEach(() => {
  vi.mocked(intrinsicSize).mockResolvedValue(null);
});

const picture: QuoinBlock = { id: 'img', type: 'IMAGE', data: { storageKey: 'fixture.png', alt: 'A red square' } };
const png = new File(['png'], 'cat.png', { type: 'image/png' });

describe('a file dropped on the picture of an image', () => {
  it('goes on in an empty line after it when the drop comes before the selectionchange of the click ahead of it', async () => {
    let land!: () => void;
    const upload: UploadFn = (file) =>
      new Promise((resolve) => (land = () => resolve({ storageKey: `key-${file.name}`, filename: file.name, size: 1 })));
    const { shell, handle, last } = mountCanvas([paragraph('a', 'above'), picture, paragraph('b', 'below')], { upload });
    const host = shell('b').querySelector<HTMLElement>('[data-quoin-host]')!;
    act(() => {
      fireEvent.pointerDown(host);
      host.focus();
      document.getSelection()!.collapse(host.firstChild!.firstChild ?? host.firstChild, 2);
    });
    act(() => handle().controller.onFiles?.([png], { block: 'img', region: '', offset: 0 }));
    act(() => void document.dispatchEvent(new Event('selectionchange')));
    await act(async () => land());
    await waitFor(() =>
      expect(last()?.map((block) => `${block.type}:${String(block.data.markdown ?? block.data.storageKey)}`)).toEqual([
        'MARKDOWN:above',
        'IMAGE:fixture.png',
        'IMAGE:key-cat.png',
        'MARKDOWN:',
        'MARKDOWN:below',
      ]),
    );
  });
});
