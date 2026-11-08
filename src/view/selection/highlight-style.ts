const MARKER = 'data-quoin-highlight';

const RULE = '.quoin ::highlight(quoin-selection){background:var(--quoin-selection)}';

/**
 * Adds the rule that paints the custom highlight to the page, rather than shipping it in the stylesheet: a CSS parser
 * that does not know `::highlight()` reports a parse failure on the packaged file and names the consumer's own
 * stylesheet for it. Browsers without the highlight API never reach this, so the rule lands only where it parses.
 */
export function installHighlightStyle(doc: Document): void {
  const head = doc.head;
  if (!head || doc.querySelector(`style[${MARKER}]`) !== null) return;
  const style = doc.createElement('style');
  style.setAttribute(MARKER, '');
  style.textContent = RULE;
  head.append(style);
}
