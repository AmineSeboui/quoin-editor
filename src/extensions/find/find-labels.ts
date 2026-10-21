/** Every string the find and replace feature shows or speaks. */
export type FindLabels = {
  /** The name of the panel. */
  findAndReplace: string;
  /** The name of the field of the text to find. */
  find: string;
  /** The name of the field of the replacement. */
  replaceWith: string;
  /** The names of the option toggles. */
  matchCase: string;
  wholeWord: string;
  regularExpression: string;
  previousMatch: string;
  nextMatch: string;
  /** The button that replaces the current match. */
  replace: string;
  /** The button that replaces every match. */
  replaceAll: string;
  close: string;
  /** What the panel shows when the query matches nothing. */
  noResults: string;
  /** What it shows when the query is read as a regular expression that cannot be read. */
  invalidPattern: string;
  /** Which match is current, counting from 1, of how many; `more` when the document holds more than `total`. */
  matchCount(current: number, total: number, more: boolean): string;
};

const grouped = (value: number) => String(value).replace(/\B(?=(\d{3})+$)/g, ',');

export const englishFindLabels: FindLabels = {
  findAndReplace: 'Find and replace',
  find: 'Find',
  replaceWith: 'Replace with',
  matchCase: 'Match case',
  wholeWord: 'Whole word',
  regularExpression: 'Regular expression',
  previousMatch: 'Previous match',
  nextMatch: 'Next match',
  replace: 'Replace',
  replaceAll: 'Replace all',
  close: 'Close',
  noResults: 'No results',
  invalidPattern: 'Invalid regular expression',
  matchCount: (current, total, more) => `${grouped(current)} of ${grouped(total)}${more ? '+' : ''}`,
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveFindLabels(overrides?: Partial<FindLabels>): FindLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishFindLabels : { ...englishFindLabels, ...Object.fromEntries(given) };
}
