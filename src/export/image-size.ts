export type ImageFormat = {
  readonly extension: 'png' | 'jpeg' | 'gif' | 'webp';
  readonly type: string;
  readonly width?: number;
  readonly height?: number;
};

type Size = { width: number; height: number } | undefined;

const startsWith = (bytes: Uint8Array, signature: readonly number[], at = 0) =>
  bytes.length >= at + signature.length && signature.every((byte, index) => bytes[at + index] === byte);

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

const sized = (width: number, height: number): Size => (width > 0 && height > 0 ? { width, height } : undefined);

function pngSize(view: DataView): Size {
  return view.byteLength >= 24 ? sized(view.getUint32(16), view.getUint32(20)) : undefined;
}

function gifSize(view: DataView): Size {
  return view.byteLength >= 10 ? sized(view.getUint16(6, true), view.getUint16(8, true)) : undefined;
}

// A frame header (SOF0 to SOF15 but DHT, JPG and DAC) holds the height then the width, after the sample precision.
// Any marker may follow a run of 0xFF fill bytes.
function jpegSize(view: DataView): Size {
  let at = 2;
  while (at + 9 <= view.byteLength && view.getUint8(at) === 0xff) {
    if (view.getUint8(at + 1) === 0xff) {
      at++;
      continue;
    }
    const marker = view.getUint8(at + 1);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return sized(view.getUint16(at + 7), view.getUint16(at + 5));
    }
    at += 2 + view.getUint16(at + 2);
  }
  return undefined;
}

const uint24 = (view: DataView, at: number) => view.getUint8(at) | (view.getUint8(at + 1) << 8) | (view.getUint8(at + 2) << 16);

function webpSize(view: DataView, bytes: Uint8Array): Size {
  if (startsWith(bytes, ascii('VP8 '), 12) && view.byteLength >= 30) {
    return sized(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
  }
  if (startsWith(bytes, ascii('VP8L'), 12) && view.byteLength >= 25) {
    const bits = view.getUint32(21, true);
    return sized((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (startsWith(bytes, ascii('VP8X'), 12) && view.byteLength >= 30) return sized(uint24(view, 24) + 1, uint24(view, 27) + 1);
  return undefined;
}

const FORMATS = [
  { extension: 'png', signature: [0x89, 0x50, 0x4e, 0x47], size: pngSize },
  { extension: 'jpeg', signature: [0xff, 0xd8, 0xff], size: jpegSize },
  { extension: 'gif', signature: ascii('GIF8'), size: gifSize },
  { extension: 'webp', signature: ascii('RIFF'), size: webpSize },
] as const;

/** The format of a picture Word can show, read from its first bytes, with its size in pixels when the header gives it. */
export function imageFormat(bytes: Uint8Array): ImageFormat | null {
  const format = FORMATS.find(
    ({ extension, signature }) =>
      startsWith(bytes, signature) && (extension !== 'webp' || startsWith(bytes, ascii('WEBP'), 8)),
  );
  if (!format) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { extension: format.extension, type: `image/${format.extension}`, ...format.size(view, bytes) };
}
