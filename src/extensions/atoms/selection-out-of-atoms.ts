type DomPoint = readonly [Node, number];

const ELEMENT_NODE = 1;

function atomAround(node: Node | null, root: Element, types: readonly string[]): Element | null {
  const element = node === null || node.nodeType === ELEMENT_NODE ? (node as Element | null) : node.parentElement;
  const atom = element?.closest('[data-quoin-atom]') ?? null;
  return atom !== null && root.contains(atom) && types.includes(atom.getAttribute('data-quoin-atom') ?? '') ? atom : null;
}

function beside(atom: Element, after: boolean): DomPoint {
  const parent = atom.parentNode as Node;
  return [parent, Array.prototype.indexOf.call(parent.childNodes, atom) + (after ? 1 : 0)];
}

function follows(atom: Element, [node, offset]: DomPoint): boolean {
  const range = atom.ownerDocument.createRange();
  range.selectNode(atom);
  return range.comparePoint(node, offset) > 0;
}

// The editor reads a caret inside an atom as standing after it once half its text or more lies before the caret.
function pastMiddle(atom: Element, [node, offset]: DomPoint): boolean {
  const range = atom.ownerDocument.createRange();
  range.setStart(atom, 0);
  range.setEnd(node, offset);
  const before = range.toString().length;
  return before > 0 && before * 2 >= (atom.textContent ?? '').length;
}

/**
 * Moves the ends of the selection that lie inside an atom of one of `types` out of it, where the browser types again:
 * an end of a range to the side away from the other end, so the range holds the atom whole, a range inside one atom to
 * that atom, and a caret to the side the editor reads it at. Returns whether it moved anything.
 */
export function moveSelectionOutOfAtoms(selection: Selection, root: Element, types: readonly string[]): boolean {
  const { anchorNode, anchorOffset, focusNode, focusOffset } = selection;
  if (anchorNode === null || focusNode === null) return false;
  const anchorAtom = atomAround(anchorNode, root, types);
  const focusAtom = atomAround(focusNode, root, types);
  if (anchorAtom === null && focusAtom === null) return false;
  const anchor: DomPoint = [anchorNode, anchorOffset];
  const focus: DomPoint = [focusNode, focusOffset];
  let ends: readonly [DomPoint, DomPoint];
  if (selection.isCollapsed) {
    const caret = beside(focusAtom as Element, pastMiddle(focusAtom as Element, focus));
    ends = [caret, caret];
  } else if (anchorAtom === focusAtom) {
    ends = [beside(anchorAtom as Element, false), beside(anchorAtom as Element, true)];
  } else {
    ends = [
      anchorAtom === null ? anchor : beside(anchorAtom, !follows(anchorAtom, focus)),
      focusAtom === null ? focus : beside(focusAtom, !follows(focusAtom, anchor)),
    ];
  }
  selection.setBaseAndExtent(ends[0][0], ends[0][1], ends[1][0], ends[1][1]);
  return true;
}
