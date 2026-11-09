export type InlineDirection = 'ltr' | 'rtl';

/** The way lines run in an element, as laid out, whether set with `dir` on the page or with CSS. */
export const inlineDirection = (element: Element): InlineDirection =>
  getComputedStyle(element).direction === 'rtl' ? 'rtl' : 'ltr';

const MIRRORED: Readonly<Record<string, string>> = { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft' };

/**
 * The arrow that means, on a left to right page, what `key` means on a page laid out the given way. A horizontal arrow
 * names a side of the screen rather than a movement, so a table of moves written for one direction is read through
 * here instead of being written twice. A vertical arrow, and every other key, comes back unchanged.
 */
export const arrowAsWritten = (key: string, direction: InlineDirection): string =>
  direction === 'rtl' && Object.hasOwn(MIRRORED, key) ? MIRRORED[key] : key;
