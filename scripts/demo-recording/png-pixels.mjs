import { inflateSync } from 'node:zlib';

const CHANNELS = { 2: 3, 6: 4 };

const paeth = (left, up, upLeft) => {
  const estimate = left + up - upLeft;
  const toLeft = Math.abs(estimate - left);
  const toUp = Math.abs(estimate - up);
  const toUpLeft = Math.abs(estimate - upLeft);
  if (toLeft <= toUp && toLeft <= toUpLeft) return left;
  return toUp <= toUpLeft ? up : upLeft;
};

function chunks(png) {
  const found = { idat: [] };
  for (let offset = 8; offset < png.length; ) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('latin1', offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') found.header = data;
    if (type === 'IDAT') found.idat.push(data);
    offset += length + 12;
  }
  return found;
}

function unfilter(raw, width, height, channels) {
  const stride = width * channels;
  const pixels = new Uint8Array(stride * height);
  for (let row = 0; row < height; row += 1) {
    const filter = raw[row * (stride + 1)];
    const line = raw.subarray(row * (stride + 1) + 1, (row + 1) * (stride + 1));
    const at = row * stride;
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? pixels[at + i - channels] : 0;
      const up = row > 0 ? pixels[at + i - stride] : 0;
      const upLeft = row > 0 && i >= channels ? pixels[at + i - stride - channels] : 0;
      const predictor = [0, left, up, (left + up) >> 1, paeth(left, up, upLeft)][filter];
      pixels[at + i] = (line[i] + predictor) & 0xff;
    }
  }
  return pixels;
}

/** Decodes an 8-bit, non-interlaced RGB or RGBA PNG, such as a browser screenshot, into RGBA pixels. */
export function pngPixels(png) {
  const { header, idat } = chunks(png);
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const channels = CHANNELS[header[9]];
  if (header[8] !== 8 || !channels || header[12] !== 0) throw new Error('Only 8-bit, non-interlaced RGB or RGBA PNGs are read');
  const pixels = unfilter(inflateSync(Buffer.concat(idat)), width, height, channels);
  if (channels === 4) return { width, height, rgba: pixels };
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) {
    rgba.set(pixels.subarray(i, i + 3), j);
    rgba[j + 3] = 255;
  }
  return { width, height, rgba };
}
