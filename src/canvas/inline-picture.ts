import { readPicture } from './read-picture';

/** The largest picture a paste may carry inline for the canvas to upload: 10 MB. */
export const MAX_INLINE_PICTURE_BYTES = 10 * 1024 * 1024;

// Counted before the address is read: base64 writes three bytes in four characters, and any other data address at
// least a character for each byte.
function heldBytes(url: string): number {
  const comma = url.indexOf(',');
  const length = url.length - comma - 1;
  return /;base64$/i.test(url.slice(0, comma)) ? Math.floor((length * 3) / 4) : length;
}

export const isTooLarge = (url: string): boolean => heldBytes(url) > MAX_INLINE_PICTURE_BYTES;

/** Reads a picture from its data address into a file named for its type, such as `image.png`. */
export const inlinePicture = (url: string): Promise<File | null> =>
  readPicture(url, (type) => `image.${type.slice('image/'.length).split('+')[0]}`);
