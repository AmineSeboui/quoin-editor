import { jpegFrame } from '../../export/jpeg-frame';
import { pdfArray } from '../file/pdf-syntax';
import type { PdfImage } from './pdf-image';

const SPACES: Readonly<Record<number, string>> = { 1: '/DeviceGray', 3: '/DeviceRGB', 4: '/DeviceCMYK' };
const INVERTED_CMYK = pdfArray([1, 0, 1, 0, 1, 0, 1, 0]);

// Adobe software marks the JPEGs it writes with an APP14 segment, and stores the inks of a CMYK one inverted.
function fromAdobe(head: Uint8Array): boolean {
  for (let at = head.indexOf(0xff); at >= 0 && at + 9 <= head.length; at = head.indexOf(0xff, at + 1)) {
    if (head[at + 1] === 0xee && String.fromCharCode(...head.subarray(at + 4, at + 9)) === 'Adobe') return true;
  }
  return false;
}

/** A JPEG as a PDF image, its bytes passed through whole; null where a PDF has no colour space for its components. */
export function jpegImage(data: Uint8Array): PdfImage | null {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const at = jpegFrame(view);
  if (at === undefined || at + 10 > view.byteLength) return null;
  const [precision, height, width, components] = [view.getUint8(at + 4), view.getUint16(at + 5), view.getUint16(at + 7), view.getUint8(at + 9)];
  const space = SPACES[components];
  if (!space || precision !== 8 || width === 0 || height === 0) return null;
  const decode = components === 4 && fromAdobe(data.subarray(0, at)) ? INVERTED_CMYK : undefined;
  return { width, height, dict: { ColorSpace: space, BitsPerComponent: 8, Filter: '/DCTDecode', Decode: decode }, data, pixels: false };
}
