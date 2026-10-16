/** A solid 2px keyboard focus outline in --quoin-ring. An outline rather than a ring, because forced-colors mode drops
 *  box-shadow and repaints an outline in a system colour. The outline is deliberately not suppressed at rest with
 *  Tailwind's forced-colors aware utility: applied unconditionally, it draws a 2px outline round every control in
 *  forced-colors mode, so the focused one no longer stands out. */
export const FOCUS_RING = [
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid',
  'focus-visible:outline-[var(--quoin-ring)]',
].join(' ');

/** An inset bar that marks the highlighted row of a Radix menu or select, so the row is not
 *  told apart from its neighbours by background colour alone. */
export const HIGHLIGHT_BAR = 'data-[highlighted]:shadow-[inset_2px_0_0_var(--quoin-foreground)]';
