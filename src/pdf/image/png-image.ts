import { inflate } from '../../export/deflate';
import type { PdfImage } from './pdf-image';
import { CHANNELS, pngChunks, type PngHeader } from './png-chunks';
import { passesOf, unfilterPass, type Unfiltered } from './png-unfilter';

// A larger picture is drawn as its alt text rather than decoded into memory several times its size.
const MAX_PIXELS = 40_000_000;

type Sample = (x: number, y: number, channel: number) => number;

// A sample as stored: eight bits, sixteen bits, or fewer packed into bytes from the high bit down.
function sampler({ rows, stride }: Unfiltered, depth: number, channels: number): Sample {
  if (depth === 8) return (x, y, channel) => rows[y * stride + x * channels + channel];
  if (depth === 16) return (x, y, channel) => (rows[y * stride + (x * channels + channel) * 2] << 8) | rows[y * stride + (x * channels + channel) * 2 + 1];
  return (x, y, channel) => {
    const bit = (x * channels + channel) * depth;
    return (rows[y * stride + (bit >> 3)] >> (8 - depth - (bit & 7))) & ((1 << depth) - 1);
  };
}

const scaler = (depth: number) => (value: number) => (depth === 16 ? value >> 8 : depth === 8 ? value : Math.round((value * 255) / ((1 << depth) - 1)));

const keyed = (png: PngHeader, channel: number) => (png.transparency ? (png.transparency[channel * 2] << 8) | png.transparency[channel * 2 + 1] : -1);

/** Writes one pixel of each colour type as grey or RGB, and its alpha. */
function writer(png: PngHeader, color: Uint8Array, alpha: Uint8Array) {
  const scale = scaler(png.depth);
  const { palette, transparency } = png;
  return (pixel: number, sample: (channel: number) => number) => {
    if (png.color === 0 || png.color === 4) {
      const gray = sample(0);
      color[pixel] = scale(gray);
      if (png.color === 4) alpha[pixel] = scale(sample(1));
      else if (gray === keyed(png, 0)) alpha[pixel] = 0;
      return;
    }
    if (png.color === 3) {
      const index = sample(0);
      for (let channel = 0; channel < 3; channel++) color[pixel * 3 + channel] = palette![index * 3 + channel] ?? 0;
      alpha[pixel] = transparency?.[index] ?? 255;
      return;
    }
    const rgb = [sample(0), sample(1), sample(2)];
    rgb.forEach((value, channel) => (color[pixel * 3 + channel] = scale(value)));
    if (png.color === 6) alpha[pixel] = scale(sample(3));
    else if (rgb.every((value, channel) => value === keyed(png, channel))) alpha[pixel] = 0;
  };
}

/** A PNG decoded to eight bit grey or RGB pixels, its alpha a mask of its own; null where it cannot be read. */
export async function pngImage(bytes: Uint8Array): Promise<PdfImage | null> {
  const png = pngChunks(bytes);
  if (!png || png.width * png.height > MAX_PIXELS) return null;
  const raw = await inflate(png.data, 'deflate');
  if (!raw) return null;
  const channels = CHANNELS[png.color];
  const gray = png.color === 0 || png.color === 4;
  const color = new Uint8Array(png.width * png.height * (gray ? 1 : 3));
  const alpha = new Uint8Array(png.width * png.height).fill(255);
  const write = writer(png, color, alpha);
  let at = 0;
  for (const pass of passesOf(png.width, png.height, png.interlaced)) {
    const unfiltered = unfilterPass(raw, at, pass, channels * png.depth);
    if (!unfiltered) return null;
    at = unfiltered.end;
    const sample = sampler(unfiltered, png.depth, channels);
    for (let y = 0; y < pass.height; y++) {
      for (let x = 0; x < pass.width; x++) {
        write((pass.y0 + y * pass.dy) * png.width + pass.x0 + x * pass.dx, (channel) => sample(x, y, channel));
      }
    }
  }
  const dict = { ColorSpace: gray ? '/DeviceGray' : '/DeviceRGB', BitsPerComponent: 8 };
  return { width: png.width, height: png.height, dict, data: color, pixels: true, alpha: alpha.every((value) => value === 255) ? undefined : alpha };
}
