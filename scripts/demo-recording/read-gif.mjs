const skipSubBlocks = (bytes, offset) => {
  let at = offset;
  while (bytes[at] !== 0) at += bytes[at] + 1;
  return at + 1;
};

const tableSize = (packed) => (packed & 0x80 ? 3 * 2 ** ((packed & 0x07) + 1) : 0);

/** Reads a GIF's signature, size, loop count and each frame's delay in milliseconds, without decoding pixels. */
export function readGif(input) {
  const bytes = Uint8Array.from(input);
  const view = new DataView(bytes.buffer);
  const info = {
    signature: String.fromCharCode(...bytes.subarray(0, 6)),
    width: view.getUint16(6, true),
    height: view.getUint16(8, true),
    loops: null,
    delays: [],
  };
  let at = 13 + tableSize(bytes[10]);
  let delay = 0;
  while (at < bytes.length && bytes[at] !== 0x3b) {
    if (bytes[at] === 0x21) {
      const label = bytes[at + 1];
      if (label === 0xf9) delay = view.getUint16(at + 4, true) * 10;
      if (label === 0xff && String.fromCharCode(...bytes.subarray(at + 3, at + 14)) === 'NETSCAPE2.0') {
        info.loops = view.getUint16(at + 16, true);
      }
      at = skipSubBlocks(bytes, at + 2);
    } else if (bytes[at] === 0x2c) {
      info.delays.push(delay);
      at = skipSubBlocks(bytes, at + 10 + tableSize(bytes[at + 9]) + 1);
    } else {
      throw new Error(`Unexpected GIF block 0x${bytes[at].toString(16)} at ${at}`);
    }
  }
  return info;
}
