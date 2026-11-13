import { flateStream, type ObjectTable } from '../file/object-table';
import { pdfRef } from '../file/pdf-syntax';
import type { PdfImage } from './pdf-image';

/** Writes a picture as an image, with its transparency as a soft mask, and returns the number of the image. */
export async function imageObject(image: PdfImage, table: ObjectTable): Promise<number> {
  const size = { Type: '/XObject', Subtype: '/Image', Width: image.width, Height: image.height };
  const mask = image.alpha && table.add(await flateStream({ ...size, ColorSpace: '/DeviceGray', BitsPerComponent: 8 }, image.alpha));
  const dict = { ...size, ...image.dict, SMask: mask ? pdfRef(mask) : undefined };
  return table.add(image.pixels ? await flateStream(dict, image.data) : { dict, data: image.data });
}
