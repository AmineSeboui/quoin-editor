import type { PdfEntries } from '../file/pdf-syntax';

/**
 * A picture ready to write as an image: a JPEG passed through whole, or the pixels of a decoded PNG, which the writer
 * deflates, with its transparency as a mask of its own.
 */
export type PdfImage = {
  readonly width: number;
  readonly height: number;
  readonly dict: PdfEntries;
  readonly data: Uint8Array;
  readonly pixels: boolean;
  readonly alpha?: Uint8Array;
};
