import { serializeInline } from '../markdown/inline/serialize-inline';
import { fromMarkdown } from '../markdown/block/from-markdown';
import { parseLine } from '../markdown/line-kind';
import { text as textNode } from '../model/inline';
import { newId } from '../model/new-id';
import type { QuoinBlock } from '../model/quoin-block';
import { availableParser, fromHTML, type DOMParserLike } from './from-html';
import { looksLikeMarkdown, plainTextToBlocks } from './from-text';
import { parseSliceJSON } from './parse-slice-json';
import { pastedLink } from './paste-url';
import type { Slice } from './slice';

export type ClipboardData = { json?: string; html?: string; text?: string };
export type SliceFromClipboardOptions = { parser?: DOMParserLike; newId?: () => string };

const isParagraph = (block: QuoinBlock): boolean =>
  block.type === 'MARKDOWN' && parseLine(String(block.data.markdown ?? '')).kind === 'paragraph';

function openSlice(blocks: QuoinBlock[], plainText = false): Slice | null {
  if (blocks.length === 0) return null;
  const slice = { blocks, openStart: isParagraph(blocks[0]), openEnd: isParagraph(blocks[blocks.length - 1]) };
  return plainText ? { ...slice, plainText } : slice;
}

function linkBlocks(text: string, makeId: () => string): QuoinBlock[] | null {
  const link = pastedLink(text);
  if (link === null) return null;
  const { url, href, rest } = link;
  const linked = textNode(url, [{ type: 'link', attrs: { href } }]);
  const markdown = serializeInline(rest === '' ? [linked] : [linked, textNode(rest)]);
  return [{ id: makeId(), type: 'MARKDOWN', data: { markdown } }];
}

function textBlocks(text: string, makeId: () => string): QuoinBlock[] {
  const link = linkBlocks(text, makeId);
  if (link !== null) return link;
  return looksLikeMarkdown(text) ? fromMarkdown(text, { newId: makeId }) : plainTextToBlocks(text, makeId);
}

function htmlSlice(html: string | undefined, options: SliceFromClipboardOptions): Slice | null {
  if (html === undefined) return null;
  const parser = availableParser(options.parser);
  return parser === null ? null : openSlice(fromHTML(html, { ...options, parser }));
}

export function sliceFromClipboard(data: ClipboardData, options: SliceFromClipboardOptions = {}): Slice | null {
  const fromJson = data.json === undefined ? null : parseSliceJSON(data.json);
  if (fromJson !== null) return fromJson;
  const fromHtml = htmlSlice(data.html, options);
  if (fromHtml !== null) return fromHtml;
  return data.text === undefined ? null : openSlice(textBlocks(data.text, options.newId ?? newId), true);
}
