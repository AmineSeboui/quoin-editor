import { decodeEntities } from './entities';

const ASCII_PUNCTUATION = /^[!-/:-@[-`{-~]$/;
const ESCAPED = /\\([!-/:-@[-`{-~])/g;

export function isEscapable(char: string | undefined): boolean {
  return char !== undefined && ASCII_PUNCTUATION.test(char);
}

export function unescapeMarkdown(value: string): string {
  return value
    .split(ESCAPED)
    .map((part, index) => (index % 2 === 1 ? part : decodeEntities(part)))
    .join('');
}
