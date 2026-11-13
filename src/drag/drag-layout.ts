import { isClosedToggle } from '../engine/commands/collapsed-toggle';
import { movedBlockIds } from '../engine/commands/move-blocks-to';
import { inlineDirection, type InlineDirection } from '../ui/direction';
import type { ViewController } from '../view';
import { visibleBlockIndexes } from '../view/navigation/visible-blocks';
import type { DropCandidate } from './drop-target';

export type DragBox = { top: number; left: number; width: number };

type Measured = DropCandidate & { shell: HTMLElement; end: number };

/** The drawn blocks at the start of a drag, in coordinates relative to the editor root's padding box. */
export type DragLayout = {
  blocks: readonly DropCandidate[];
  /** The dragged shells that fit in the viewport, and the box they cover, in viewport coordinates. */
  ghostShells: readonly HTMLElement[];
  ghost: DragBox;
  /** Where the text of the first dragged block starts, which is where the pointer's indent is measured from. */
  draggedStart: number;
  /** The x the furthest block reaches on the side its lines end, where the drop line ends. */
  end: number;
  indentStep: number;
  direction: InlineDirection;
  /** The index among the blocks that stay that a drop in this gap between drawn blocks moves the dragged ones to. */
  toIndex(gap: number): number;
};

export function rootOrigin(root: HTMLElement): { x: number; y: number } {
  const box = root.getBoundingClientRect();
  return { x: box.left + root.clientLeft - root.scrollLeft, y: box.top + root.clientTop - root.scrollTop };
}

/** The horizontal span between two x positions, whichever side each is on. */
export const spanBetween = (a: number, b: number) => ({ left: Math.min(a, b), width: Math.abs(b - a) });

const leadingMargin = (element: HTMLElement, rtl: boolean) =>
  parseFloat(getComputedStyle(element)[rtl ? 'marginRight' : 'marginLeft']) || 0;

// Read from bare copies of a shell at two depths, so a drop nests by whatever the page's stylesheet indents a level by.
// Copies rather than the shell itself, whose margin a transition would hold still. A page that draws no indent still
// nests by an em of travel.
function indentStep(shell: HTMLElement, rtl: boolean): number {
  const copies = [0, 1].map((depth) => {
    const copy = shell.cloneNode(false) as HTMLElement;
    copy.removeAttribute('id');
    copy.removeAttribute('data-block-id');
    copy.style.setProperty('--quoin-indent', String(depth));
    copy.style.display = 'none';
    return copy;
  });
  shell.after(...copies);
  const [flat, nested] = copies.map((copy) => leadingMargin(copy, rtl));
  for (const copy of copies) copy.remove();
  return nested > flat ? nested - flat : parseFloat(getComputedStyle(shell).fontSize) || 16;
}

function inlineEdges(shell: HTMLElement, box: DOMRect, rtl: boolean): { start: number; end: number } {
  const margin = leadingMargin(shell, rtl);
  return rtl ? { start: box.right + margin, end: box.left } : { start: box.left - margin, end: box.right };
}

function measure(controller: ViewController, root: HTMLElement, moved: ReadonlySet<string>, rtl: boolean): Measured[] {
  const { doc } = controller.editor.state;
  const origin = rootOrigin(root);
  return visibleBlockIndexes(doc).flatMap((index) => {
    const block = doc.blocks[index];
    const shell = controller.blockElement(block.id);
    if (shell === undefined) return [];
    const box = shell.getBoundingClientRect();
    const { start, end } = inlineEdges(shell, box, rtl);
    return [
      {
        id: block.id,
        top: box.top - origin.y,
        bottom: box.bottom - origin.y,
        start: start - origin.x,
        end: end - origin.x,
        indent: block.indent,
        dragged: moved.has(block.id),
        hidesNested: isClosedToggle(block),
        shell,
      },
    ];
  });
}

const furthestEnd = (blocks: readonly Measured[], rtl: boolean) =>
  blocks.reduce((end, block) => (rtl ? Math.min(end, block.end) : Math.max(end, block.end)), blocks[0].end);

export function measureDrag(controller: ViewController, root: HTMLElement, ids: readonly string[]): DragLayout | null {
  const { doc } = controller.editor.state;
  const direction = inlineDirection(root);
  const rtl = direction === 'rtl';
  const moved = new Set(movedBlockIds(doc, ids));
  const blocks = measure(controller, root, moved, rtl);
  const dragged = blocks.filter((block) => block.dragged);
  if (dragged.length === 0) return null;
  const [first] = dragged;
  const origin = rootOrigin(root);
  const viewport = root.ownerDocument.defaultView?.innerHeight ?? Infinity;
  const step = indentStep(first.shell, rtl);
  const rest = doc.blocks.filter((block) => !moved.has(block.id));
  const restIndex = new Map(rest.map((block, index) => [block.id, index]));
  const staying = blocks.filter((block) => !block.dragged);
  const ghostSpan = spanBetween(first.start, furthestEnd(dragged, rtl));
  return {
    blocks,
    ghostShells: dragged.filter((block) => block.top - first.top < viewport).map((block) => block.shell),
    ghost: { top: first.top + origin.y, left: ghostSpan.left + origin.x, width: ghostSpan.width },
    draggedStart: first.start + (rtl ? -1 : 1) * first.indent * step,
    end: furthestEnd(blocks, rtl),
    indentStep: step,
    direction,
    toIndex: (gap) => (gap < staying.length ? (restIndex.get(staying[gap].id) ?? rest.length) : rest.length),
  };
}
