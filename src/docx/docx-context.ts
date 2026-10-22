import type { Heading } from '../engine/render/headings';
import type { Schema } from '../engine/schema/types';
import type { LoadedImage } from './images';

export type Relationship = { readonly id: string; readonly kind: 'hyperlink' | 'image'; readonly target: string };

export type ListNumbering = { readonly numId: number; readonly ordered: boolean; readonly level: number; readonly start: number };

export type Media = { readonly path: string; readonly data: Uint8Array; readonly extension: string; readonly type: string };

export type PlacedImage = { readonly rId: string; readonly image: LoadedImage; readonly name: string };

/** What the parts of a Word document share while its body is written: relationships, lists, pictures and bookmarks. */
export type DocxContext = {
  readonly schema: Schema;
  readonly resolveAssetUrl: (storageKey: string) => string | null;
  readonly headings: readonly Heading[];
  readonly bookmarks: ReadonlyMap<string, string>;
  readonly relationships: Relationship[];
  readonly lists: ListNumbering[];
  readonly media: Media[];
  link(target: string): string;
  list(ordered: boolean, level: number, start: number): number;
  picture(url: string | null): PlacedImage | null;
  drawingId(): number;
};

// The styles and numbering parts take the first two relationship ids.
const FIRST_RELATIONSHIP = 3;

export type ContextInput = Pick<DocxContext, 'schema' | 'resolveAssetUrl' | 'headings'> & {
  readonly images: ReadonlyMap<string, LoadedImage | null>;
};

// Bookmark names starting with an underscore are hidden in Word's bookmark list.
export function createContext({ schema, resolveAssetUrl, headings, images }: ContextInput): DocxContext {
  const bookmarks = new Map(headings.map(({ blockId }, at) => [blockId, `_q${at + 1}`]));
  const relationships: Relationship[] = [];
  const lists: ListNumbering[] = [];
  const media: Media[] = [];
  const related = new Map<string, string>();
  const placed = new Map<string, PlacedImage>();
  let drawings = 0;
  const relate = (kind: Relationship['kind'], target: string) => {
    const key = `${kind} ${target}`;
    let id = related.get(key);
    if (id === undefined) {
      id = `rId${relationships.length + FIRST_RELATIONSHIP}`;
      related.set(key, id);
      relationships.push({ id, kind, target });
    }
    return id;
  };
  return {
    schema,
    resolveAssetUrl,
    headings,
    bookmarks,
    relationships,
    lists,
    media,
    link: (target) => relate('hyperlink', target),
    list(ordered, level, start) {
      const numId = lists.length + 1;
      lists.push({ numId, ordered, level, start });
      return numId;
    },
    picture(url) {
      const image = url === null ? null : images.get(url);
      if (!url || !image) return null;
      let place = placed.get(url);
      if (!place) {
        const name = `image${media.length + 1}.${image.extension}`;
        media.push({ path: `word/media/${name}`, data: image.data, extension: image.extension, type: image.type });
        place = { rId: relate('image', `media/${name}`), image, name };
        placed.set(url, place);
      }
      return place;
    },
    drawingId: () => ++drawings,
  };
}
