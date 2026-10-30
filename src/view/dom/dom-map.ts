export type DomPoint = { node: Node; offset: number };

export type DomMap = {
  readonly length: number;
  toDom(offset: number, assoc?: -1 | 1): DomPoint;
  fromDom(node: Node, offset: number): number | null;
};

export type MapEntry = {
  readonly node: Node;
  readonly from: number;
  readonly to: number;
  readonly kind: 'text' | 'break' | 'atom' | 'widget' | 'filler' | 'wrapper';
};

const TEXT_NODE = 3;

const textLength = (node: Node): number => (node.textContent ?? '').length;
const indexIn = (node: Node): number => Array.prototype.indexOf.call((node.parentNode as Node).childNodes, node);
const pointAt = (entry: MapEntry, shift: number): DomPoint => ({
  node: entry.node.parentNode as Node,
  offset: indexIn(entry.node) + shift,
});

function textBefore(root: Node, node: Node, offset: number): number {
  let length = 0;
  if (node.nodeType === TEXT_NODE) {
    length = Math.min(offset, textLength(node));
  } else {
    let child = node.firstChild;
    for (let index = 0; child && index < offset; index++, child = child.nextSibling) {
      length += textLength(child);
    }
  }
  for (let current = node; current !== root; current = current.parentNode as Node) {
    for (let sibling = current.previousSibling; sibling; sibling = sibling.previousSibling) {
      length += textLength(sibling);
    }
  }
  return length;
}

// Entries arrive in document order and tile the content: text, breaks and atoms by width, widgets and the filler by
// position.
export function createDomMap(host: HTMLElement, length: number, entries: readonly MapEntry[]): DomMap {
  const byNode = new Map<Node, MapEntry>(entries.map((entry) => [entry.node, entry]));
  const texts = entries.filter((entry) => entry.kind === 'text');
  const breaksAndAtoms = entries.filter((entry) => entry.kind === 'break' || entry.kind === 'atom');
  const stops = entries.filter((entry) => entry.kind === 'break' || entry.kind === 'atom' || entry.kind === 'filler');

  function toDom(offset: number, assoc: -1 | 1 = 1): DomPoint {
    const at = Math.min(Math.max(offset, 0), length);
    const after = texts.find((entry) => entry.from <= at && at < entry.to);
    const before = texts.find((entry) => entry.from < at && at <= entry.to);
    const text = assoc === 1 ? (after ?? before) : (before ?? after);
    if (text) return { node: text.node, offset: Math.min(at - text.from, textLength(text.node)) };
    const next = stops.find((entry) => entry.from >= at);
    const previous = breaksAndAtoms.filter((entry) => entry.to <= at).pop();
    const beforeNext = next && pointAt(next, 0);
    const afterPrevious = previous && pointAt(previous, 1);
    return (assoc === 1 ? (beforeNext ?? afterPrevious) : (afterPrevious ?? beforeNext)) ?? { node: host, offset: 0 };
  }

  function atChild(parent: Node, offset: number, end: number): number {
    const children = parent.childNodes;
    for (let index = offset; index < children.length; index++) {
      const entry = byNode.get(children[index]);
      if (entry) return entry.from;
    }
    return end;
  }

  function enclosingAtom(node: Node): MapEntry | undefined {
    for (let current: Node | null = node; current && current !== host; current = current.parentNode) {
      const entry = byNode.get(current);
      if (entry?.kind === 'atom' || entry?.kind === 'widget') return entry;
    }
    return undefined;
  }

  function fromDom(node: Node, offset: number): number | null {
    if (!host.contains(node)) return null;
    if (node === host) return atChild(host, offset, length);
    const atom = enclosingAtom(node);
    if (atom?.kind === 'widget') return atom.from;
    if (atom) {
      const inside = textBefore(atom.node, node, offset);
      return inside > 0 && inside * 2 >= textLength(atom.node) ? atom.to : atom.from;
    }
    const entry = byNode.get(node);
    if (!entry) return fromDom(node.parentNode as Node, indexIn(node));
    if (node.nodeType === TEXT_NODE) return entry.from + Math.min(offset, entry.to - entry.from);
    if (entry.kind === 'break') return offset > 0 ? entry.to : entry.from;
    return atChild(node, offset, entry.to);
  }

  return { length, toDom, fromDom };
}
