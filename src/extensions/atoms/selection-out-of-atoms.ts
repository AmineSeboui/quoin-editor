import { domMapOf, type DomMap, type DomPoint } from '../../view';

type HostOf = (node: Node) => HTMLElement | null;

const ELEMENT_NODE = 1;

function atomAround(node: Node, types: readonly string[]): Element | null {
  const element = node.nodeType === ELEMENT_NODE ? (node as Element) : node.parentElement;
  const atom = element?.closest('[data-quoin-atom]') ?? null;
  return atom !== null && types.includes(atom.getAttribute('data-quoin-atom') ?? '') ? atom : null;
}

function follows(atom: Element, { node, offset }: DomPoint): boolean {
  const range = atom.ownerDocument.createRange();
  range.selectNode(atom);
  return range.comparePoint(node, offset) > 0;
}

function mapOf(atom: Element, hostOf: HostOf): DomMap | undefined {
  const host = hostOf(atom);
  return host === null ? undefined : domMapOf(host);
}

// A range leans into what it holds, as the view writes one.
function beside(atom: Element, after: boolean, hostOf: HostOf): DomPoint | null {
  const map = mapOf(atom, hostOf);
  const from = map?.fromDom(atom, 0);
  if (map === undefined || from === null || from === undefined) return null;
  return after ? map.toDom(from + 1, -1) : map.toDom(from, 1);
}

// A caret goes where the view reads it, leaning on what comes before it.
function caretOutside(atom: Element, { node, offset }: DomPoint, hostOf: HostOf): DomPoint | null {
  const map = mapOf(atom, hostOf);
  const at = map?.fromDom(node, offset);
  return map === undefined || at === null || at === undefined ? null : map.toDom(at, -1);
}

/**
 * Moves the ends of the selection that lie inside an atom of one of `types` out of it, where the browser types again:
 * an end of a range to the side away from the other end, so the range holds the atom whole, a range inside one atom to
 * that atom, and a caret to the side the view reads it at. Each place comes from the map of the atom's line, which
 * `hostOf` finds. Returns whether it moved anything.
 */
export function moveSelectionOutOfAtoms(selection: Selection, hostOf: HostOf, types: readonly string[]): boolean {
  const { anchorNode, anchorOffset, focusNode, focusOffset } = selection;
  if (anchorNode === null || focusNode === null) return false;
  const anchor: DomPoint = { node: anchorNode, offset: anchorOffset };
  const focus: DomPoint = { node: focusNode, offset: focusOffset };
  const anchorAtom = atomAround(anchorNode, types);
  const focusAtom = atomAround(focusNode, types);
  let ends: readonly (DomPoint | null)[];
  if (focusAtom !== null && selection.isCollapsed) {
    const caret = caretOutside(focusAtom, focus, hostOf);
    ends = [caret, caret];
  } else if (focusAtom !== null && anchorAtom === focusAtom) {
    ends = [beside(focusAtom, false, hostOf), beside(focusAtom, true, hostOf)];
  } else {
    ends = [
      anchorAtom === null ? anchor : beside(anchorAtom, !follows(anchorAtom, focus), hostOf),
      focusAtom === null ? focus : beside(focusAtom, !follows(focusAtom, anchor), hostOf),
    ];
  }
  const [base, extent] = ends;
  if ((anchorAtom === null && focusAtom === null) || base === null || extent === null) return false;
  selection.setBaseAndExtent(base.node, base.offset, extent.node, extent.offset);
  return true;
}
