import { trimBlank } from './lines';

const OPENING_TAG = /^\s*<summary(?:\s[^>]*)?>/i;
const FINAL_CLOSING_TAG = /<\/summary>[ \t]*$/i;
const FIRST_CLOSING_TAG = /<\/summary>[\s\S]*$/i;

export function summaryText(lines: readonly string[]): string {
  const text = lines.join('\n').replace(OPENING_TAG, '');
  return trimBlank(text.replace(FINAL_CLOSING_TAG.test(text) ? FINAL_CLOSING_TAG : FIRST_CLOSING_TAG, ''));
}
