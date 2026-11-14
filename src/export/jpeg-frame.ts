/**
 * The offset of the frame header of a JPEG, SOF0 to SOF15 but DHT, JPG and DAC, which holds the height then the width
 * after the sample precision, then the number of components. Any marker may follow a run of 0xFF fill bytes.
 */
export function jpegFrame(view: DataView): number | undefined {
  let at = 2;
  while (at + 9 <= view.byteLength && view.getUint8(at) === 0xff) {
    if (view.getUint8(at + 1) === 0xff) {
      at++;
      continue;
    }
    const marker = view.getUint8(at + 1);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) return at;
    at += 2 + view.getUint16(at + 2);
  }
  return undefined;
}
