import { createBlockCodec, textSelection, toMarkdown, type EditorState, type Pos, type QuoinBlock } from '../../engine';
import { sliceFromSelection } from '../../engine/clipboard/extract-slice';
import type { AiAction, AiRequest } from './ai-actions';
import type { AiTarget } from './ai-target';

export const CONTEXT_LIMIT = 8_000;

const BOUNDARY = '\n\n';

const isHigh = (code: number) => code >= 0xd800 && code <= 0xdbff;
const isLow = (code: number) => code >= 0xdc00 && code <= 0xdfff;

/**
 * At most `limit` characters of `text` centred on `start` to `end`, cut at block boundaries where one is in reach and
 * never between the two halves of a surrogate pair.
 */
export function aroundSelection(text: string, start: number, end: number, limit = CONTEXT_LIMIT): string {
  if (text.length <= limit) return text;
  let from = Math.max(0, Math.min(Math.round((start + end - limit) / 2), text.length - limit));
  let to = from + limit;
  if (from > 0) {
    const boundary = text.indexOf(BOUNDARY, from);
    if (boundary !== -1 && boundary + BOUNDARY.length <= Math.min(start, to)) from = boundary + BOUNDARY.length;
  }
  if (to < text.length) {
    const boundary = text.lastIndexOf(BOUNDARY, to - BOUNDARY.length);
    if (boundary >= Math.max(end, from)) to = boundary + 1;
  }
  if (isLow(text.charCodeAt(from))) from++;
  if (to > from && isHigh(text.charCodeAt(to - 1))) to--;
  return text.slice(from, to);
}

// The engine writes a space or tab it must keep as an entity; a model reads plain markdown. A typed entity is escaped
// with a backslash, so it stays.
const WHITESPACE_ENTITY = /(?<!\\)&#(32|9);/g;

const plain = (markdown: string) => markdown.replace(WHITESPACE_ENTITY, (_, code) => (code === '32' ? ' ' : '\t'));

const markdownOf = (state: EditorState, blocks: readonly QuoinBlock[]) =>
  toMarkdown(blocks, { schema: state.schema, comments: false });

function rangeMarkdown(state: EditorState, from: Pos, to: Pos): string {
  const slice = sliceFromSelection({ ...state, selection: textSelection(from, to) }, createBlockCodec(state.schema));
  return slice === null ? '' : markdownOf(state, slice.blocks).replace(/\n$/, '');
}

function documentContext(state: EditorState, target: AiTarget, selection: string): string {
  const blocks = createBlockCodec(state.schema).blocksFromDoc(state.doc);
  const full = plain(markdownOf(state, blocks));
  if (full.length <= CONTEXT_LIMIT) return full;
  const index = state.doc.index.get(target.from.block) ?? 0;
  const blockStart = index === 0 ? 0 : plain(markdownOf(state, blocks.slice(0, index))).length + 1;
  const lead = { ...target.from, offset: 0 };
  const start = blockStart + plain(rangeMarkdown(state, lead, target.from)).length;
  return aroundSelection(full, start, start + selection.length);
}

export type RequestInput = { action: AiAction; prompt?: string; language?: string };

export function buildRequest(state: EditorState, target: AiTarget, input: RequestInput): AiRequest {
  const selection = plain(rangeMarkdown(state, target.from, target.to));
  const request: AiRequest = { action: input.action, selection, context: documentContext(state, target, selection) };
  if (input.prompt !== undefined) request.prompt = input.prompt;
  if (input.language !== undefined) request.language = input.language;
  return request;
}
