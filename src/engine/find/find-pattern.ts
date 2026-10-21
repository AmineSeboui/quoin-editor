import type { FindQuery } from './find-types';

const SYNTAX = /[\\^$.*+?()[\]{}|/]/g;
const WORD = '[\\p{L}\\p{N}_]';

/**
 * The expression of a search, global and Unicode aware, or the message of the pattern that cannot be read. Plain text
 * is escaped rather than lowercased, since lowercasing can change the length of a string and so its offsets.
 */
export function findPattern({ query, caseSensitive, wholeWord, regex }: FindQuery): RegExp | { error: string } {
  const body = regex ? query : query.replace(SYNTAX, '\\$&');
  const flags = caseSensitive ? 'gu' : 'giu';
  try {
    // The query is read on its own first, so that one such as `a)(b` cannot close the word boundary's group.
    const pattern = new RegExp(body, flags);
    return wholeWord ? new RegExp(`(?<!${WORD})(?:${body})(?!${WORD})`, flags) : pattern;
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
