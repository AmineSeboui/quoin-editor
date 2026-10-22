import { element, type HtmlNode } from '../engine/render/html-node';

// Inline, so the text stays hidden on a page that does not load the stylesheet.
const VISUALLY_HIDDEN = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap';

/** Text a screen reader speaks and copied text keeps, never shown. */
export const hiddenText = (text: string): HtmlNode =>
  element('span', [['class', 'quoin-diff-hidden'], ['style', VISUALLY_HIDDEN]], [text]);
