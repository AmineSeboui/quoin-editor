type TextPoint = { node: Text; offset: number };

function textPoint(root: Node, offset: number): TextPoint | null {
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let rest = offset;
  for (let node = walker.nextNode() as Text | null; node !== null; node = walker.nextNode() as Text | null) {
    if (rest <= node.data.length) return { node, offset: rest };
    rest -= node.data.length;
  }
  return null;
}

// Left of the character before the caret, measured where the drawn code shows it: tabs and wide characters included.
function caretLeft(drawn: HTMLElement, caret: number): number | null {
  const from = textPoint(drawn, caret - 1);
  const to = textPoint(drawn, caret);
  if (from === null || to === null) return null;
  const range = drawn.ownerDocument.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  const right = range.getBoundingClientRect?.().right;
  return right === undefined ? null : right - drawn.getBoundingClientRect().left;
}

/**
 * Scrolls the caret of the text area into view, which the browser does not do for a caret set by script. The drawn
 * code holds the same text, character for character and line for line, so the mark is put where it draws the caret.
 */
export function revealCaret(area: HTMLTextAreaElement, drawn: HTMLElement, mark: HTMLElement): void {
  const { value, selectionEnd: caret } = area;
  const style = getComputedStyle(area);
  const line = value.slice(0, caret).split('\n').length - 1;
  const atLineStart = caret === 0 || value[caret - 1] === '\n';
  const left = atLineStart ? null : caretLeft(drawn, caret);
  mark.style.top = `${(parseFloat(style.paddingTop) || 0) + line * (parseFloat(style.lineHeight) || 0)}px`;
  mark.style.left = `${left ?? (parseFloat(style.paddingLeft) || 0)}px`;
  mark.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
