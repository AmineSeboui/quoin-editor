export type InlineDirection = 'ltr' | 'rtl';

/** The way lines run in an element, as laid out, whether set with `dir` on the page or with CSS. */
export const inlineDirection = (element: Element): InlineDirection =>
  getComputedStyle(element).direction === 'rtl' ? 'rtl' : 'ltr';
