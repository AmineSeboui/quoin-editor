import type { Pos, Selection } from '../../engine';
import { nodeSelection, sameSelection, textSelection } from '../../engine/state/selection';
import { domMapOf, type DomPoint } from '../dom/render-inline';
import type { HostRegistry } from './host-registry';

export function domToPos(registry: HostRegistry, node: Node, offset: number): Pos | null {
  const host = registry.locate(node);
  const mapped = host && domMapOf(host.element)?.fromDom(node, offset);
  return host && typeof mapped === 'number' ? { block: host.block, region: host.region, offset: mapped } : null;
}

export function posToDom(registry: HostRegistry, pos: Pos, assoc?: -1 | 1): DomPoint | null {
  const host = registry.get(pos.block, pos.region);
  return (host && domMapOf(host)?.toDom(pos.offset, assoc)) ?? null;
}

export function readSelection(
  registry: HostRegistry,
  domSelection: globalThis.Selection | null,
  blockAt: (node: Node) => string | undefined = () => undefined,
): Selection | null {
  const anchorNode = domSelection?.anchorNode;
  const focusNode = domSelection?.focusNode;
  if (!domSelection || !anchorNode || !focusNode) return null;
  const anchor = domToPos(registry, anchorNode, domSelection.anchorOffset);
  const head = domToPos(registry, focusNode, domSelection.focusOffset);
  if (anchor && head) return textSelection(anchor, head);
  if (anchor || head || registry.locate(anchorNode) || registry.locate(focusNode)) return null;
  const block = blockAt(anchorNode);
  return block !== undefined && block === blockAt(focusNode) ? nodeSelection(block) : null;
}

function selectBlock(domSelection: globalThis.Selection, element: HTMLElement | undefined): boolean {
  if (!element) return false;
  if (!element.contains(element.ownerDocument.activeElement)) element.focus();
  const { anchorNode, focusNode } = domSelection;
  if (!anchorNode || !focusNode || !element.contains(anchorNode) || !element.contains(focusNode)) {
    domSelection.collapse(element, 0);
  }
  return true;
}

const drawnUpstream = new WeakMap<globalThis.Selection, DomPoint>();

// A caret written at a soft wrap is drawn at the start of the next line, but one the browser moves there by line
// boundary from the glyph before is drawn at the end of the line. The selection does not say which it draws, so the
// point last drawn that way is remembered, or the point written in place where the caret is no longer at a wrap.
function drawUpstream(registry: HostRegistry, pos: Pos, domSelection: globalThis.Selection, drawn?: DomPoint): boolean {
  const caret = textSelection(pos);
  const isAt = () => sameSelection(readSelection(registry, domSelection), caret);
  if (drawn?.node === domSelection.focusNode && drawn.offset === domSelection.focusOffset && isAt()) {
    drawnUpstream.set(domSelection, drawn);
    return true;
  }
  const before = pos.offset > 0 && posToDom(registry, { ...pos, offset: pos.offset - 1 });
  if (!before || typeof domSelection.modify !== 'function') return false;
  domSelection.collapse(before.node, before.offset);
  domSelection.modify('move', 'forward', 'lineboundary');
  drawnUpstream.set(domSelection, { node: domSelection.focusNode!, offset: domSelection.focusOffset });
  return isAt();
}

// A range's ends lean into the selected content and a caret leans on the text before it, which is where the model
// takes a caret's marks from.
export function writeSelection(
  registry: HostRegistry,
  selection: Selection | null,
  domSelection: globalThis.Selection | null,
  blockElement: (id: string) => HTMLElement | undefined,
): boolean {
  if (!selection || !domSelection) return false;
  if (selection.kind === 'node') return selectBlock(domSelection, blockElement(selection.block));
  if (selection.kind !== 'text') return false;
  const { anchor, head } = selection;
  if (anchor.block !== head.block || anchor.region !== head.region) return false;
  const drawn = drawnUpstream.get(domSelection);
  drawnUpstream.delete(domSelection);
  if (sameSelection(readSelection(registry, domSelection), selection)) return true;
  if (selection.assoc === -1 && anchor.offset === head.offset && drawUpstream(registry, head, domSelection, drawn)) {
    return true;
  }
  const base = posToDom(registry, anchor, anchor.offset < head.offset ? 1 : -1);
  const extent = posToDom(registry, head, head.offset < anchor.offset ? 1 : -1);
  if (!base || !extent) return false;
  domSelection.setBaseAndExtent(base.node, base.offset, extent.node, extent.offset);
  if (selection.assoc === -1) drawnUpstream.set(domSelection, extent);
  return true;
}
