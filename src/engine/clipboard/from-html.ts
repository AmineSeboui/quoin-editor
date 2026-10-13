import { createBlockCodec } from '../blocks/codec';
import { newId } from '../model/new-id';
import type { QuoinBlock } from '../model/quoin-block';
import { createSchema } from '../schema/create-schema';
import { blocksFromBody } from './html-blocks';

export type DOMParserLike = { parseFromString(html: string, type: 'text/html'): Document };

export type FromHTMLOptions = { parser?: DOMParserLike; newId?: () => string };

export function fromHTML(html: string, options: FromHTMLOptions = {}): QuoinBlock[] {
  const parser = options.parser ?? (typeof globalThis.DOMParser === 'function' ? new globalThis.DOMParser() : null);
  if (parser === null) throw new Error('fromHTML needs a DOMParser');
  const makeId = options.newId ?? newId;
  const codec = createBlockCodec(createSchema(), { newId: makeId });
  const { body } = parser.parseFromString(html, 'text/html');
  return blocksFromBody(body, makeId).map((block) => codec.toQuoin(block));
}
