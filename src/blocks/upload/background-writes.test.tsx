import { act } from '@testing-library/react';
import { textSelection } from '../../engine';
import type { QuoinBlock, UploadFn } from '../../types';
import { uploadFile } from '../file/file-upload';
import { measureImage, uploadImage } from '../image/image-upload';
import { intrinsicSize } from '../intrinsic-size';
import { mountCanvas, paragraph } from '../void/test-canvas';

vi.mock('../intrinsic-size');

const resolveAssetUrl = (key: string) => `/cdn/${key}`;
const stored: UploadFn = async (file) => ({ storageKey: `key-${file.name}`, filename: file.name, size: file.size });
const png = new File(['png'], 'cat.png', { type: 'image/png' });
const pdf = new File(['pdf'], 'notes.pdf', { type: 'application/pdf' });
const image = (storageKey = ''): QuoinBlock => ({ id: 'i', type: 'IMAGE', data: { storageKey, alt: '' } });
const file: QuoinBlock = { id: 'f', type: 'FILE', data: { storageKey: '', filename: '' } };

beforeEach(() => {
  vi.mocked(intrinsicSize).mockReset().mockResolvedValue({ width: 40, height: 30 });
});

function mount(blocks: QuoinBlock[]) {
  const canvas = mountCanvas([paragraph('a', 'above'), ...blocks], { upload: stored, resolveAssetUrl });
  const controller = () => canvas.handle().controller;
  const caretInText = () => act(() => canvas.handle().focus({ block: 'a', region: 'text', offset: 5 }));
  // A browser moves focus into the text when a script draws a selection there, which jsdom does not do, so the drawn
  // selection is watched as well as focus.
  const leaveForPage = () =>
    act(() => {
      (document.activeElement as HTMLElement | null)?.blur();
      document.getSelection()?.removeAllRanges();
    });
  const expectFocusOnPage = () => {
    expect(document.activeElement).toBe(document.body);
    expect(document.getSelection()?.rangeCount).toBe(0);
  };
  return { ...canvas, controller, caretInText, leaveForPage, expectFocusOnPage };
}

describe('a write that lands while focus is on the page, not the editor', () => {
  it('leaves focus there when an upload lands in an image block selected as a whole', async () => {
    const { controller, nodeSelect, leaveForPage, expectFocusOnPage, last } = mount([image()]);
    nodeSelect('i');
    leaveForPage();
    await act(() => uploadImage(controller(), 'i', png, { upload: stored, resolveAssetUrl }));
    expect(last()[1].data).toEqual({ storageKey: 'key-cat.png', alt: '', width: 40, height: 30 });
    expectFocusOnPage();
  });

  it('leaves focus there when the measured size of a picture lands', async () => {
    const { controller, nodeSelect, leaveForPage, expectFocusOnPage, last } = mount([image('cat.png')]);
    nodeSelect('i');
    leaveForPage();
    await act(() => measureImage(controller(), 'i', 'cat.png', resolveAssetUrl));
    expect(last()[1].data).toEqual({ storageKey: 'cat.png', alt: '', width: 40, height: 30 });
    expectFocusOnPage();
  });

  it('leaves focus there when an upload lands in a file block', async () => {
    const { controller, caretInText, leaveForPage, expectFocusOnPage, last } = mount([file]);
    caretInText();
    leaveForPage();
    await act(() => uploadFile(controller(), 'f', pdf, { upload: stored, resolveAssetUrl }));
    expect(last()[1].data).toMatchObject({ storageKey: 'key-notes.pdf', filename: 'notes.pdf' });
    expectFocusOnPage();
  });

  it('leaves focus there when files pasted in the text land as blocks, and when their pictures are measured', async () => {
    const { controller, caretInText, leaveForPage, expectFocusOnPage, last, selection } = mount([]);
    caretInText();
    act(() => controller().onFiles?.([png, pdf], { block: 'a', region: 'text', offset: 5 }));
    leaveForPage();
    await act(async () => {});
    expect(last().map((block) => block.type)).toEqual(['MARKDOWN', 'IMAGE', 'FILE']);
    expect(last()[1].data).toEqual({ storageKey: 'key-cat.png', alt: '', width: 40, height: 30 });
    expect(selection()).toEqual(textSelection({ block: 'a', region: 'text', offset: 5 }));
    expectFocusOnPage();
  });
});
