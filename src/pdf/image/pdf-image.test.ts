// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FIXTURE_PNG } from '../../../e2e/app/fixture-png';
import { pngFile } from '../test-support/png-file';
import { jpegImage } from './jpeg-image';
import { pngImage } from './png-image';

const be16 = (value: number) => [value >> 8, value & 0xff];
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));
const jpeg = (components: number, ...segments: number[][]) =>
  Uint8Array.from([0xff, 0xd8, ...segments.flat(), 0xff, 0xc0, ...be16(8 + components * 3), 8, ...be16(30), ...be16(40), components, ...Array(components * 3).fill(1), 0xff, 0xda]);

afterEach(() => vi.unstubAllGlobals());

describe('jpegImage', () => {
  it('passes a JPEG through whole, with the colour space of its components', () => {
    const bytes = jpeg(3);
    const image = jpegImage(bytes)!;
    expect(image).toMatchObject({ width: 40, height: 30, pixels: false, dict: { ColorSpace: '/DeviceRGB', BitsPerComponent: 8, Filter: '/DCTDecode' } });
    expect(image.data).toBe(bytes);
    expect(jpegImage(jpeg(1))!.dict.ColorSpace).toBe('/DeviceGray');
  });

  it('inverts a CMYK JPEG that Adobe software wrote, as those store their inks inverted', () => {
    expect(jpegImage(jpeg(4))!.dict).toMatchObject({ ColorSpace: '/DeviceCMYK', Decode: undefined });
    const adobe = [0xff, 0xee, ...be16(14), ...ascii('Adobe'), 0, 100, 0, 0, 0, 0, 2];
    expect(jpegImage(jpeg(4, adobe))!.dict.Decode).toBe('[1 0 1 0 1 0 1 0]');
  });

  it('refuses a JPEG with no frame header or with components a PDF has no colour space for', () => {
    expect(jpegImage(Uint8Array.of(0xff, 0xd8, 0xff, 0xd9))).toBeNull();
    expect(jpegImage(jpeg(2))).toBeNull();
  });
});

describe('pngImage', () => {
  it('decodes an RGB PNG to its pixels, with no mask when every pixel is opaque', async () => {
    const rows = [
      [255, 0, 0, 0, 255, 0],
      [0, 0, 255, 10, 20, 30],
    ];
    const image = (await pngImage(pngFile({ width: 2, height: 2, depth: 8, color: 2, rows })))!;
    expect(image).toMatchObject({ width: 2, height: 2, pixels: true, alpha: undefined, dict: { ColorSpace: '/DeviceRGB', BitsPerComponent: 8 } });
    expect([...image.data]).toEqual(rows.flat());
  });

  it.each([0, 1, 2, 3, 4] as const)('undoes filter type %i', async (filter) => {
    const rows = [
      [10, 200, 30, 40, 50, 60, 70, 80, 90],
      [90, 80, 70, 60, 50, 40, 30, 20, 10],
      [5, 250, 5, 250, 5, 250, 128, 0, 255],
    ];
    const image = (await pngImage(pngFile({ width: 3, height: 3, depth: 8, color: 2, rows, filter })))!;
    expect([...image.data]).toEqual(rows.flat());
  });

  it('splits the alpha of an RGBA PNG into a mask of its own', async () => {
    const image = (await pngImage(pngFile({ width: 2, height: 1, depth: 8, color: 6, rows: [[1, 2, 3, 0, 4, 5, 6, 128]] })))!;
    expect([...image.data]).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...image.alpha!]).toEqual([0, 128]);
  });

  it('keeps a grey PNG grey, and scales samples of fewer than eight bits up to the full range', async () => {
    const image = (await pngImage(pngFile({ width: 4, height: 1, depth: 2, color: 0, rows: [[0b00011011]] })))!;
    expect(image.dict.ColorSpace).toBe('/DeviceGray');
    expect([...image.data]).toEqual([0, 85, 170, 255]);
  });

  it('reads the high byte of sixteen bit samples, and the grey and alpha of a grey PNG with alpha', async () => {
    const image = (await pngImage(pngFile({ width: 1, height: 1, depth: 16, color: 4, rows: [[0x12, 0x34, 0x80, 0x00]] })))!;
    expect([...image.data]).toEqual([0x12]);
    expect([...image.alpha!]).toEqual([0x80]);
  });

  it('looks a palette PNG up in its palette, its transparency chunk giving each entry an alpha', async () => {
    const palette = [255, 0, 0, 0, 255, 0, 0, 0, 255];
    const image = (await pngImage(pngFile({ width: 3, height: 1, depth: 4, color: 3, rows: [[0x01, 0x20]], palette, transparency: [255, 0] })))!;
    expect([...image.data]).toEqual(palette);
    expect([...image.alpha!]).toEqual([255, 0, 255]);
  });

  it('makes the colour a transparency chunk names transparent in an RGB PNG', async () => {
    const image = (await pngImage(pngFile({ width: 2, height: 1, depth: 8, color: 2, rows: [[9, 9, 9, 1, 2, 3]], transparency: [0, 9, 0, 9, 0, 9] })))!;
    expect([...image.alpha!]).toEqual([0, 255]);
  });

  it('puts the seven passes of an interlaced PNG back together', async () => {
    const rows = Array.from({ length: 9 }, (_, y) => Array.from({ length: 10 * 3 }, (_, x) => (y * 31 + x * 7) & 0xff));
    const image = (await pngImage(pngFile({ width: 10, height: 9, depth: 8, color: 2, rows, interlaced: true, filter: 4 })))!;
    expect([...image.data]).toEqual(rows.flat());
  });

  it('decodes the fixture picture', async () => {
    const image = (await pngImage(Uint8Array.from(Buffer.from(FIXTURE_PNG.base64, 'base64'))))!;
    expect([image.width, image.height, image.data.length]).toEqual([40, 30, 40 * 30 * (image.dict.ColorSpace === '/DeviceGray' ? 1 : 3)]);
  });

  it('refuses a PNG it cannot read', async () => {
    const good = pngFile({ width: 1, height: 1, depth: 8, color: 2, rows: [[1, 2, 3]] });
    expect(await pngImage(good.subarray(0, 30))).toBeNull();
    expect(await pngImage(pngFile({ width: 1, height: 1, depth: 3, color: 2, rows: [[1]] }))).toBeNull();
    const badColor = Uint8Array.from(good);
    badColor[25] = 7;
    expect(await pngImage(badColor)).toBeNull();
    expect(await pngImage(pngFile({ width: 2, height: 2, depth: 8, color: 2, rows: [[1, 2, 3, 4, 5, 6]] }))).toBeNull();
  });

  it('refuses a PNG where the runtime cannot inflate', async () => {
    vi.stubGlobal('DecompressionStream', undefined);
    expect(await pngImage(pngFile({ width: 1, height: 1, depth: 8, color: 2, rows: [[1, 2, 3]] }))).toBeNull();
  });
});
