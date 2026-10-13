import type { Pos, Selection } from '../../engine';
import { nodeSelection, sameSelection, textSelection } from '../../engine/state/selection';
import { domMapOf, type DomPoint } from '../dom/render-inline';
import type { HostRegistry } from './host-registry';

function domToPos(registry: HostRegistry, node: Node, offset: number): Pos | null {
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
  if (sameSelection(readSelection(registry, domSelection), selection)) return true;
  const base = posToDom(registry, anchor, anchor.offset < head.offset ? 1 : -1);
  const extent = posToDom(registry, head, head.offset < anchor.offset ? 1 : -1);
  if (!base || !extent) return false;
  domSelection.setBaseAndExtent(base.node, base.offset, extent.node, extent.offset);
  return true;
}
