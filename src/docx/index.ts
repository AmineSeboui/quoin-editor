// The whole engine entry, so that the bundler splits none of the chunks the other entries share around the modules
// this entry reaches.
import '../engine/index';
import { sanitizeHref } from '../engine/markdown/urls';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { groupBlocks } from '../engine/render/block-groups';
import { engineBlocksOf } from '../engine/render/engine-blocks';
import { collectHeadings } from '../engine/render/toc-node';
import { createSchema } from '../engine/schema/create-schema';
import type { Schema } from '../engine/schema/types';
import { pictureUrl } from './asset-source';
import { createContext } from './docx-context';
import { documentXml } from './document-xml';
import type { FetchAsset } from './fetch-asset';
import { loadImages } from './images';
import { numberingXml } from './numbering-xml';
import { contentTypesXml, corePropertiesXml, documentRelationshipsXml, packageRelationshipsXml } from './package-xml';
import { stylesXml } from './styles-xml';
import { zipArchive } from './zip';

export type { FetchAsset } from './fetch-asset';

export type DocxOptions = {
  schema?: Schema;
  /** The address of a stored picture or file. One that is no http, https, blob, data or relative address is left out. */
  resolveAssetUrl?: (storageKey: string) => string;
  /** Reads a picture at its resolved address, the global `fetch` by default. A picture that fails is replaced by its alt text. */
  fetchAsset?: FetchAsset;
  /** The title written into the document's properties. */
  title?: string;
  /** How long to wait for one picture, in milliseconds, before writing its alt text instead: 10,000 by default. */
  imageTimeout?: number;
  /** How many pictures to fetch at a time, 4 by default. */
  imageConcurrency?: number;
};

const WORD_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const IMAGE_TIMEOUT = 10_000;
const IMAGE_CONCURRENCY = 4;

const encode = (xml: string) => new TextEncoder().encode(xml);

/** The blocks as a Word document. It runs in a browser, a worker or Node 18 and later, with no DOM and no dependency. */
export async function toDocx(blocks: readonly QuoinBlock[], options: DocxOptions = {}): Promise<Blob> {
  const schema = options.schema ?? createSchema();
  const resolveAssetUrl = options.resolveAssetUrl ?? sanitizeHref;
  const engine = engineBlocksOf(blocks, schema);
  const urls = engine.filter((block) => block.type === 'IMAGE').map((block) => pictureUrl(block, resolveAssetUrl));
  const images = await loadImages(
    urls.filter((url): url is string => url !== null),
    {
      fetchAsset: options.fetchAsset,
      timeout: options.imageTimeout ?? IMAGE_TIMEOUT,
      concurrency: options.imageConcurrency ?? IMAGE_CONCURRENCY,
    },
  );
  const ctx = createContext({ schema, resolveAssetUrl, headings: collectHeadings(engine, schema), images });
  const mainPart = documentXml(groupBlocks(engine), ctx);
  const archive = await zipArchive([
    { path: '[Content_Types].xml', data: encode(contentTypesXml(ctx.media)) },
    { path: '_rels/.rels', data: encode(packageRelationshipsXml()) },
    { path: 'docProps/core.xml', data: encode(corePropertiesXml(options.title)) },
    { path: 'word/document.xml', data: encode(mainPart) },
    { path: 'word/styles.xml', data: encode(stylesXml()) },
    { path: 'word/numbering.xml', data: encode(numberingXml(ctx.lists)) },
    { path: 'word/_rels/document.xml.rels', data: encode(documentRelationshipsXml(ctx.relationships)) },
    ...ctx.media.map(({ path, data }) => ({ path, data })),
  ]);
  return new Blob([archive as BlobPart], { type: WORD_TYPE });
}
