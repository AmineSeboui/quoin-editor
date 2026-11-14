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
import { pictureUrl } from '../export/asset-source';
import type { FetchAsset } from '../export/fetch-asset';
import { webBase } from '../export/link-target';
import { writeDocument } from './document/write-document';
import { fontSet } from './font/font-set';
import { hostFaces, type PdfFonts } from './font/host-faces';
import { loadPictures } from './image/load-pictures';
import { groupsBoxes } from './layout/document-boxes';
import type { LayoutContext } from './layout/layout-context';
import { pageGeometry, type PdfMargin, type PdfPageSize } from './layout/page-geometry';
import { paginate } from './layout/paginate';
import type { PdfProblem } from './pdf-problem';

export type { FetchAsset } from '../export/fetch-asset';
export type { PdfFontData, PdfFonts } from './font/host-faces';
export type { PdfMargin, PdfPageSize } from './layout/page-geometry';
export type { PdfFontRole, PdfProblem } from './pdf-problem';

export type PdfOptions = {
  schema?: Schema;
  /** The address of a stored picture or file. One that is no http, https, blob, data or relative address is left out. */
  resolveAssetUrl?: (storageKey: string) => string;
  /** Reads a picture at its resolved address, the global `fetch` by default. A picture that fails is replaced by its alt text. */
  fetchAsset?: FetchAsset;
  /**
   * The absolute http or https address of the page the document comes from, such as `location.href`. A link or a file
   * whose address is a relative path is linked to that address read against it; without it, it is written as its text.
   */
  baseUrl?: string;
  /** The title written into the document's properties, which a reader shows in place of the file name. */
  title?: string;
  /** How long to wait for one picture, in milliseconds, before writing its alt text instead: 10,000 by default. */
  imageTimeout?: number;
  /** How many pictures to fetch at a time, 4 by default. */
  imageConcurrency?: number;
  /** The paper size, `'a4'` by default. */
  pageSize?: PdfPageSize;
  /** The margins in points, 72 (an inch) on every side by default. */
  margin?: PdfMargin;
  /**
   * TrueType files to embed, so text the standard fonts cannot draw, such as Chinese or Japanese, can be drawn, copied
   * and searched. Each face is optional; a style the host gives no face for is faked from the regular one.
   */
  fonts?: PdfFonts;
  /** Hears of each character no font draws, picture that could not be drawn and font that could not be embedded. */
  onProblem?: (problem: PdfProblem) => void;
};

const IMAGE_TIMEOUT = 10_000;
const IMAGE_CONCURRENCY = 4;

/** The blocks as a PDF. It runs in a browser, a worker or Node 18 and later, with no DOM and no dependency. */
export async function toPdf(blocks: readonly QuoinBlock[], options: PdfOptions = {}): Promise<Blob> {
  const schema = options.schema ?? createSchema();
  const resolveAssetUrl = options.resolveAssetUrl ?? sanitizeHref;
  const report = options.onProblem ?? (() => undefined);
  const engine = engineBlocksOf(blocks, schema);
  const urls = engine.filter((block) => block.type === 'IMAGE').map((block) => pictureUrl(block, resolveAssetUrl));
  const images = await loadPictures(
    urls.filter((url): url is string => url !== null),
    { fetchAsset: options.fetchAsset, timeout: options.imageTimeout ?? IMAGE_TIMEOUT, concurrency: options.imageConcurrency ?? IMAGE_CONCURRENCY },
  );
  const geometry = pageGeometry(options.pageSize, options.margin);
  const { margin } = geometry;
  const headings = collectHeadings(engine, schema);
  const missing = new Map<string, Set<string>>();
  const ctx: LayoutContext = {
    schema,
    baseUrl: webBase(options.baseUrl),
    resolveAssetUrl,
    fonts: fontSet(hostFaces(options.fonts, report)),
    images,
    headings,
    left: margin.left,
    width: geometry.width - margin.left - margin.right,
    room: geometry.height - margin.top - margin.bottom,
    missing: (blockId, clusters) => missing.set(blockId, new Set([...(missing.get(blockId) ?? []), ...clusters])),
    report,
  };
  const pagination = paginate(groupsBoxes(groupBlocks(engine), ctx), geometry);
  for (const [blockId, characters] of missing) report({ type: 'glyphs', blockId, characters: [...characters].join('') });
  const bytes = await writeDocument({ pagination, geometry, headings, title: options.title });
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
