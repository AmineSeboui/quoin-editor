import { loadImages, type ImageLoading } from '../../export/images';
import type { LoadedPicture } from '../layout/layout-context';
import { jpegImage } from './jpeg-image';
import { pngImage } from './png-image';

/** Each picture of `urls`, fetched once each, as a PDF image, or why it cannot be drawn. */
export async function loadPictures(urls: Iterable<string>, loading: ImageLoading): Promise<Map<string, LoadedPicture>> {
  const pictures = new Map<string, LoadedPicture>();
  for (const [url, image] of await loadImages(urls, loading)) {
    if (!image) {
      pictures.set(url, 'unavailable');
      continue;
    }
    const drawn = image.extension === 'jpeg' ? jpegImage(image.data) : image.extension === 'png' ? await pngImage(image.data) : null;
    pictures.set(url, drawn ?? 'format');
  }
  return pictures;
}
