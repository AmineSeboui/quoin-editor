// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FIXTURE_PNG } from '../../e2e/app/fixture-png';
import type { QuoinBlock } from '../engine/model/quoin-block';
import type { FetchAsset } from './index';
import { exportPdf } from './test-support/export-pdf';
import { PdfName } from './test-support/parse-pdf';
import { pngFile } from './test-support/png-file';

const FIXTURE = Uint8Array.from(Buffer.from(FIXTURE_PNG.base64, 'base64'));
const be16 = (value: number) => [value >> 8, value & 0xff];
const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xc0, ...be16(17), 8, ...be16(300), ...be16(400), 3, 1, 0x11, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xda, 0, 2, 0xff, 0xd9]);
const GIF = Uint8Array.from([...'GIF89a'].map((char) => char.charCodeAt(0)).concat([10, 0, 10, 0, 0, 0, 0]));
const ALPHA = pngFile({ width: 2, height: 1, depth: 8, color: 6, rows: [[255, 0, 0, 255, 0, 0, 255, 64]] });
const TEXT_WIDTH = 595.28 - 144;

const files: Record<string, Uint8Array> = { 'a.png': FIXTURE, 'b.jpg': JPEG, 'c.gif': GIF, 'd.png': ALPHA, 'broken.png': FIXTURE.subarray(0, 40) };
const fetchAsset: FetchAsset = async (url) => {
  const file = files[url.slice('https://assets.test/'.length)];
  if (!file) throw new Error('missing');
  return file;
};
const options = { resolveAssetUrl: (key: string) => `https://assets.test/${key}`, fetchAsset };
const image = (id: string, data: Record<string, unknown>): QuoinBlock => ({ id, type: 'IMAGE', data });

const xobjects = (pdf: Awaited<ReturnType<typeof exportPdf>>) => {
  const resources = pdf.file.dict(pdf.file.dict(pdf.file.pages[0].Resources).XObject ?? {});
  return Object.values(resources).map((ref) => ({ dict: pdf.file.dict(ref), data: pdf.file.stream(ref) }));
};

describe('toPdf pictures', () => {
  it('draws a PNG as an image of its pixels, at its own size in points, at the start of the text width', async () => {
    const pdf = await exportPdf([image('i', { storageKey: 'a.png', alt: 'cover' })], options);
    const [picture] = xobjects(pdf);
    expect(picture.dict).toMatchObject({ Subtype: new PdfName('Image'), Width: 40, Height: 30, BitsPerComponent: 8, Filter: new PdfName('FlateDecode') });
    expect(picture.dict.SMask).toBeUndefined();
    expect(pdf.pages[0].images).toEqual([{ name: 'Im1', x: 72, y: 841.89 - 72 - 22.5, width: 30, height: 22.5 }]);
    expect(pdf.text).toBe('');
    expect(pdf.problems).toEqual([]);
  });

  it('writes the alpha of a PNG as a soft mask', async () => {
    const pdf = await exportPdf([image('i', { storageKey: 'd.png' })], options);
    const [picture] = xobjects(pdf);
    expect([...picture.data]).toEqual([255, 0, 0, 0, 0, 255]);
    const mask = pdf.file.dict(picture.dict.SMask);
    expect([mask.Width, mask.Height, (mask.ColorSpace as PdfName).name]).toEqual([2, 1, 'DeviceGray']);
    expect([...pdf.file.stream(picture.dict.SMask)]).toEqual([255, 64]);
  });

  it('passes a JPEG through whole', async () => {
    const pdf = await exportPdf([image('i', { storageKey: 'b.jpg' })], options);
    const [picture] = xobjects(pdf);
    expect(picture.dict).toMatchObject({ Width: 400, Height: 300, Filter: new PdfName('DCTDecode'), ColorSpace: new PdfName('DeviceRGB') });
    expect(picture.data).toEqual(JPEG);
  });

  it('writes a picture used twice once', async () => {
    const pdf = await exportPdf([image('i', { storageKey: 'a.png' }), image('j', { url: 'https://assets.test/a.png' })], options);
    expect(xobjects(pdf)).toHaveLength(1);
    expect(pdf.pages[0].images.map(({ name }) => name)).toEqual(['Im1', 'Im1']);
  });

  it('sizes a picture to its width percent, shrinks a wide one to the text width and a tall one to the page', async () => {
    const half = await exportPdf([image('i', { storageKey: 'a.png', widthPercent: 50 })], options);
    expect(half.pages[0].images[0].width).toBeCloseTo(TEXT_WIDTH / 2);
    expect(half.pages[0].images[0].height).toBeCloseTo(((TEXT_WIDTH / 2) * 30) / 40);
    files['wide.jpg'] = Uint8Array.from(JPEG);
    files['wide.jpg'].set([...be16(300), ...be16(1000)], 7);
    const wide = await exportPdf([image('i', { storageKey: 'wide.jpg' })], options);
    expect(wide.pages[0].images[0].width).toBeCloseTo(TEXT_WIDTH);
    expect(wide.pages[0].images[0].height).toBeCloseTo((TEXT_WIDTH * 300) / 1000);
    files['tall.jpg'] = Uint8Array.from(JPEG);
    files['tall.jpg'].set([...be16(4000), ...be16(100)], 7);
    const tall = await exportPdf([image('i', { storageKey: 'tall.jpg' })], options);
    expect(tall.pages[0].images[0].height).toBeCloseTo(841.89 - 144);
  });

  it('places a picture at the middle or the end of the text width by its alignment', async () => {
    const pdf = await exportPdf([image('i', { storageKey: 'a.png', align: 'center' }), image('j', { storageKey: 'a.png', align: 'right' })], options);
    const [center, right] = pdf.pages[0].images;
    expect(center.x).toBeCloseTo(72 + (TEXT_WIDTH - 30) / 2);
    expect(right.x).toBeCloseTo(72 + TEXT_WIDTH - 30);
  });

  it('draws the caption below the picture, small, grey and italic', async () => {
    const pdf = await exportPdf([image('i', { storageKey: 'a.png', caption: 'The *cover*' })], options);
    const [caption] = pdf.shows('The');
    expect([caption.size, caption.font]).toEqual([9, 'Helvetica-Oblique']);
    expect(caption.y).toBeLessThan(pdf.pages[0].images[0].y);
  });

  it('draws the alt text of a picture that failed, and reports it', async () => {
    const pdf = await exportPdf([image('i', { storageKey: 'gone.png', alt: 'A "cover"' }), image('j', { storageKey: 'broken.png', alt: '' })], options);
    expect(pdf.text).toBe('A "cover"');
    expect(pdf.pages[0].images).toEqual([]);
    expect(pdf.problems).toEqual([
      { type: 'image', blockId: 'i', url: 'https://assets.test/gone.png', reason: 'unavailable' },
      { type: 'image', blockId: 'j', url: 'https://assets.test/broken.png', reason: 'format' },
    ]);
  });

  it('draws a GIF or a WebP as its alt text, as a PDF holds neither', async () => {
    const pdf = await exportPdf([image('i', { storageKey: 'c.gif', alt: 'animation' })], options);
    expect(pdf.text).toBe('animation');
    expect(pdf.problems).toEqual([{ type: 'image', blockId: 'i', url: 'https://assets.test/c.gif', reason: 'format' }]);
  });

  it('reports nothing for a picture with no address, which has nothing to fetch', async () => {
    const pdf = await exportPdf([image('i', { alt: 'placeholder' })], options);
    expect([pdf.text, pdf.problems]).toEqual(['placeholder', []]);
  });

  it('draws the alt text of a picture that takes longer than the timeout', async () => {
    const never: FetchAsset = () => new Promise(() => undefined);
    const pdf = await exportPdf([image('i', { storageKey: 'a.png', alt: 'slow' })], { ...options, fetchAsset: never, imageTimeout: 20 });
    expect(pdf.text).toBe('slow');
    expect(pdf.problems).toEqual([expect.objectContaining({ type: 'image', reason: 'unavailable' })]);
  });
});
