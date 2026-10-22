const HIDDEN =
  'class="quoin-diff-hidden" style="position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap"';

/** The markup of text a reader hears and never sees. */
export const hidden = (text: string) => `<span ${HIDDEN}>${text}</span>`;
export const ins = (html: string) => `<ins>${hidden('inserted ')}${html}${hidden(' end inserted ')}</ins>`;
export const del = (html: string) => `<del>${hidden('deleted ')}${html}${hidden(' end deleted ')}</del>`;
export const label = (text: string) => `<span data-diff-label="">${text}${hidden(': ')}</span>`;
