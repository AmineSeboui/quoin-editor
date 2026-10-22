// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FIXTURE_PNG } from '../../e2e/app/fixture-png';
import { imageFormat } from './image-size';

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));
const le16 = (value: number) => [value & 0xff, value >> 8];
const be16 = (value: number) => [value >> 8, value & 0xff];
const le24 = (value: number) => [value & 0xff, (value >> 8) & 0xff, value >> 16];
const bytes = (...parts: number[][]) => Uint8Array.from(parts.flat());

const riff = (chunk: string, body: number[]) => bytes(ascii('RIFF'), [0, 0, 0, 0], ascii('WEBP'), ascii(chunk), [0, 0, 0, 0], body);

describe('imageFormat', () => {
  it('reads a PNG', () => {
    expect(imageFormat(Buffer.from(FIXTURE_PNG.base64, 'base64'))).toEqual({ extension: 'png', type: 'image/png', width: 40, height: 30 });
  });

  it('reads a GIF', () => {
    expect(imageFormat(bytes(ascii('GIF89a'), le16(320), le16(200), [0, 0, 0]))).toMatchObject({ extension: 'gif', width: 320, height: 200 });
  });

  it('reads a JPEG from its frame header, past the segments before it', () => {
    const app0 = [0xff, 0xe0, ...be16(16), ...ascii('JFIF'), 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
    const sof2 = [0xff, 0xc2, ...be16(17), 8, ...be16(480), ...be16(640), 3];
    expect(imageFormat(bytes([0xff, 0xd8], app0, sof2))).toEqual({ extension: 'jpeg', type: 'image/jpeg', width: 640, height: 480 });
  });

  it('reads a JPEG whose markers are padded with fill bytes', () => {
    const sof0 = [0xff, 0xff, 0xff, 0xc0, ...be16(17), 8, ...be16(90), ...be16(120), 3];
    expect(imageFormat(bytes([0xff, 0xd8, 0xff, 0xff], [0xe1, ...be16(4), 0, 0], sof0))).toMatchObject({ width: 120, height: 90 });
  });

  it('reads the three kinds of WebP', () => {
    const lossy = riff('VP8 ', [0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(400), ...le16(300)]);
    const width = 1000 - 1;
    const height = 750 - 1;
    const packed = width | (height << 14);
    const lossless = riff('VP8L', [0x2f, packed & 0xff, (packed >> 8) & 0xff, (packed >> 16) & 0xff, (packed >>> 24) & 0xff]);
    const extended = riff('VP8X', [0, 0, 0, 0, ...le24(1919), ...le24(1079)]);
    expect(imageFormat(lossy)).toMatchObject({ extension: 'webp', width: 400, height: 300 });
    expect(imageFormat(lossless)).toMatchObject({ width: 1000, height: 750 });
    expect(imageFormat(extended)).toMatchObject({ width: 1920, height: 1080 });
  });

  it('knows a format by its signature even when its size cannot be read', () => {
    expect(imageFormat(bytes([0xff, 0xd8, 0xff, 0xd9]))).toEqual({ extension: 'jpeg', type: 'image/jpeg' });
    expect(imageFormat(bytes(ascii('GIF8')))).toEqual({ extension: 'gif', type: 'image/gif' });
  });

  it('knows nothing of other files', () => {
    expect(imageFormat(bytes(ascii('<svg xmlns="http://www.w3.org/2000/svg"/>')))).toBeNull();
    expect(imageFormat(new Uint8Array())).toBeNull();
  });
});
