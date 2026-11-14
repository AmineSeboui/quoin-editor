import type { Face } from '../font/face';
import type { PdfImage } from '../image/pdf-image';

/** The fonts and pictures the pages draw, each named once for every page's resources. */
export type Resources = {
  font(face: Face): string;
  image(image: PdfImage): string;
  readonly fonts: ReadonlyMap<Face, string>;
  readonly images: ReadonlyMap<PdfImage, string>;
};

export function createResources(): Resources {
  const fonts = new Map<Face, string>();
  const images = new Map<PdfImage, string>();
  const named = <T>(map: Map<T, string>, prefix: string, item: T) => {
    let name = map.get(item);
    if (name === undefined) map.set(item, (name = `${prefix}${map.size + 1}`));
    return name;
  };
  return {
    font: (face) => named(fonts, 'F', face),
    image: (image) => named(images, 'Im', image),
    fonts,
    images,
  };
}
