import { serializeInline } from '../markdown/inline/serialize-inline';
import { text } from '../model/inline';
import { newId } from '../model/new-id';
import type { QuoinBlock } from '../model/quoin-block';

const BLOCK_MARKERS = [
  /^ {0,3}#{1,6}[ \t]+\S/,
  /^[ \t]*[-*+][ \t]+\S/,
  /^[ \t]*\d{1,9}[.)][ \t]+\S/,
  /^ {0,3}>[ \t]?\S/,
  /^ {0,3}(?:`{3,}|~{3,})/,
  /^[ \t]*\|.+\|[ \t]*$/,
];
const INLINE_SYNTAX = [/\*\*[^*\n]+\*\*/, /__[^_\n]+__/, /\[[^\]\n]+\]\([^)\s]+[^)\n]*\)/, /`[^`\n]+`/, /~~[^~\n]+~~/];

export function looksLikeMarkdown(value: string): boolean {
  return (
    value.split(/\r\n|\r|\n/).some((line) => BLOCK_MARKERS.some((marker) => marker.test(line))) ||
    INLINE_SYNTAX.some((syntax) => syntax.test(value))
  );
}

export function plainTextToBlocks(value: string, makeId: () => string = newId): QuoinBlock[] {
  return value
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => ({
      id: makeId(),
      type: 'MARKDOWN',
      data: { markdown: serializeInline([text(line)], { escapeLineStart: true }) },
    }));
}
