// @vitest-environment node
import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { encodeGif, mergeStills } from './demo-recording/encode-gif.mjs';
import { pngPixels } from './demo-recording/png-pixels.mjs';
import { readGif } from './demo-recording/read-gif.mjs';

const WIDTH = 4;
const HEIGHT = 2;

const solid = ([r, g, b]: number[]) => {
  const rgba = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let at = 0; at < rgba.length; at += 4) rgba.set([r, g, b, 255], at);
  return rgba;
};

const chunk = (type: string, data: Buffer) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
};

const png = (rows: number[][], filters: number[]) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(rows[0].length / 3, 0);
  header.writeUInt32BE(rows.length, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const raw = Buffer.from(rows.flatMap((row, index) => [filters[index], ...row]));
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

describe('encodeGif', () => {
  it('writes a looping GIF89a of the given size, one frame per run of identical frames', () => {
    const white = solid([255, 255, 255]);
    const frames = [
      { rgba: white, delay: 100 },
      { rgba: solid([255, 255, 255]), delay: 200 },
      { rgba: solid([20, 40, 200]), delay: 1500 },
    ];
    const { bytes, frames: written, duration } = encodeGif(frames, WIDTH, HEIGHT);
    const gif = readGif(bytes);
    expect(gif).toEqual({ signature: 'GIF89a', width: WIDTH, height: HEIGHT, loops: 0, delays: [300, 1500] });
    expect(written).toBe(2);
    expect(duration).toBe(1800);
  });

  it('leaves the input frames as they were', () => {
    const frames = [
      { rgba: solid([0, 0, 0]), delay: 50 },
      { rgba: solid([0, 0, 0]), delay: 50 },
    ];
    expect(mergeStills(frames)).toHaveLength(1);
    expect(frames.map(({ delay }) => delay)).toEqual([50, 50]);
  });
});

describe('pngPixels', () => {
  it('undoes each row filter of an RGB PNG into RGBA pixels', () => {
    const rows = [
      [10, 20, 30, 40, 50, 60],
      [1, 2, 3, 4, 5, 6],
      [7, 8, 9, 10, 11, 12],
      [9, 9, 9, 1, 1, 1],
      [5, 5, 5, 5, 5, 5],
    ];
    const decoded = pngPixels(png(rows, [0, 1, 2, 3, 4]));
    expect({ width: decoded.width, height: decoded.height }).toEqual({ width: 2, height: 5 });
    const pixel = (x: number, y: number) => [...decoded.rgba.subarray((y * 2 + x) * 4, (y * 2 + x) * 4 + 4)];
    expect(pixel(0, 0)).toEqual([10, 20, 30, 255]);
    expect(pixel(1, 1)).toEqual([5, 7, 9, 255]);
    expect(pixel(0, 2)).toEqual([8, 10, 12, 255]);
    expect(pixel(0, 3)).toEqual([13, 14, 15, 255]);
    expect(pixel(0, 4)).toEqual([18, 19, 20, 255]);
  });
});
