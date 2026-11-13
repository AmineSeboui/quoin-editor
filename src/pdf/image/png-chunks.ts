import { concatBytes } from '../../export/concat-bytes';

export type PngHeader = {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly color: number;
  readonly interlaced: boolean;
  readonly palette?: Uint8Array;
  readonly transparency?: Uint8Array;
  /** The compressed image data, its IDAT chunks joined. */
  readonly data: Uint8Array;
};

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// The bit depths each colour type allows.
const DEPTHS: Readonly<Record<number, readonly number[]>> = { 0: [1, 2, 4, 8, 16], 2: [8, 16], 3: [1, 2, 4, 8], 4: [8, 16], 6: [8, 16] };

export const CHANNELS: Readonly<Record<number, number>> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

/** The header, palette, transparency and image data of a PNG, or null where it is no PNG this export reads. */
export function pngChunks(bytes: Uint8Array): PngHeader | null {
  if (bytes.length < 33 || SIGNATURE.some((byte, at) => bytes[at] !== byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks = new Map<string, Uint8Array[]>();
  for (let at = 8; at + 8 <= bytes.length; ) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    if (at + 12 + length > bytes.length) return null;
    chunks.set(type, [...(chunks.get(type) ?? []), bytes.subarray(at + 8, at + 8 + length)]);
    if (type === 'IEND') break;
    at += 12 + length;
  }
  const header = chunks.get('IHDR')?.[0];
  const data = chunks.get('IDAT');
  if (!header || header.length < 13 || !data) return null;
  const head = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const [width, height, depth, color] = [head.getUint32(0), head.getUint32(4), header[8], header[9]];
  if (width === 0 || height === 0 || !DEPTHS[color]?.includes(depth) || header[10] !== 0 || header[11] !== 0 || header[12] > 1) return null;
  const palette = chunks.get('PLTE')?.[0];
  if (color === 3 && !palette) return null;
  return { width, height, depth, color, interlaced: header[12] === 1, palette, transparency: chunks.get('tRNS')?.[0], data: concatBytes(data) };
}
