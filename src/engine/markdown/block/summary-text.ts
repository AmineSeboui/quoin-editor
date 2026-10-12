import { trimBlank } from './lines';

const OPENING_TAG = /^\s*<summary(?:\s[^>]*)?>/i;
const CLOSING_TAG = /<\/summary>[\s\S]*$/i;

export function summaryText(lines: readonly string[]): string {
  return trimBlank(lines.join('\n').replace(OPENING_TAG, '').replace(CLOSING_TAG, ''));
}
