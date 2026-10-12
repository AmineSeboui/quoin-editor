/** A solid 2px keyboard focus outline in --quoin-ring. An outline rather than a ring, because
 *  forced-colors mode drops box-shadow. The explicit solid style is load-bearing: the hidden
 *  outline utility sets the style to none, and the width utility reads that style back. */
export const FOCUS_RING = [
  'outline-hidden',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid',
  'focus-visible:outline-[var(--quoin-ring)]',
].join(' ');

/** An inset bar that marks the highlighted row of a Radix menu or select, so the row is not
 *  told apart from its neighbours by background colour alone. */
export const HIGHLIGHT_BAR = 'data-[highlighted]:shadow-[inset_2px_0_0_var(--quoin-foreground)]';

/** The same bar for a cmdk row, which reports its highlight as data-selected. */
export const SELECTED_BAR = 'data-[selected=true]:shadow-[inset_2px_0_0_var(--quoin-foreground)]';
