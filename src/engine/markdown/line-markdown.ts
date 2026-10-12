import { linePrefix, type LineAttrs } from './line-kind';

const TRAILING_HASHES = /([ \t])(#+)$/;

// A trailing hash run would be read back as an ATX closing sequence and dropped.
const protectClosingSequence = (markdown: string) => markdown.replace(TRAILING_HASHES, '$1\\$2');

export function lineMarkdown(line: LineAttrs, body: string): string {
  return linePrefix(line) + (line.kind === 'heading' ? protectClosingSequence(body) : body);
}
