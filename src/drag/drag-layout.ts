import { movedBlockIds } from '../engine/commands/move-blocks-to';
import type { ViewController } from '../view';
import { visibleBlockIndexes } from '../view/navigation/visible-blocks';
import type { DropCandidate } from './drop-target';

// The margin a shell takes per level of indent in view.css.
const INDENT_STEP_REM = 1.5;

export type DragBox = { top: number; left: number; width: number };

type Measured = DropCandidate & { shell: HTMLElement; right: number };

/** The drawn blocks at the start of a drag, in coordinates relative to the editor root's padding box. */
export type DragLayout = {
  blocks: readonly DropCandidate[];
  /** The dragged shells that fit in the viewport, and the box they cover, in viewport coordinates. */
  ghostShells: readonly HTMLElement[];
  ghost: DragBox;
  /** Where the text of the first dragged block starts, which is where the pointer's indent is measured from. */
  draggedLeft: number;
  right: number;
  indentStep: number;
  /** The index among the blocks that stay that a drop in this gap between drawn blocks moves the dragged ones to. */
  toIndex(gap: number): number;
};

export function rootOrigin(root: HTMLElement): { x: number; y: number } {
  const box = root.getBoundingClientRect();
  return { x: box.left + root.clientLeft - root.scrollLeft, y: box.top + root.clientTop - root.scrollTop };
}

function indentStep(doc: Document): number {
  return (parseFloat(getComputedStyle(doc.documentElement).fontSize) || 16) * INDENT_STEP_REM;
}

function measure(controller: ViewController, root: HTMLElement, moved: ReadonlySet<string>): Measured[] {
  const { doc } = controller.editor.state;
  const origin = rootOrigin(root);
  return visibleBlockIndexes(doc).flatMap((index) => {
    const { id, indent } = doc.blocks[index];
    const shell = controller.blockElement(id);
    if (shell === undefined) return [];
    const box = shell.getBoundingClientRect();
    const margin = parseFloat(getComputedStyle(shell).marginLeft) || 0;
    const left = box.left - margin - origin.x;
    const [top, bottom, right] = [box.top - origin.y, box.bottom - origin.y, box.right - origin.x];
    return [{ id, top, bottom, left, right, indent, dragged: moved.has(id), shell }];
  });
}

const rightmost = (blocks: readonly Measured[]) => blocks.reduce((right, block) => Math.max(right, block.right), 0);

export function measureDrag(controller: ViewController, root: HTMLElement, ids: readonly string[]): DragLayout | null {
  const { doc } = controller.editor.state;
  const moved = new Set(movedBlockIds(doc, ids));
  const blocks = measure(controller, root, moved);
  const dragged = blocks.filter((block) => block.dragged);
  if (dragged.length === 0) return null;
  const [first] = dragged;
  const origin = rootOrigin(root);
  const viewport = root.ownerDocument.defaultView?.innerHeight ?? Infinity;
  const step = indentStep(root.ownerDocument);
  const rest = doc.blocks.filter((block) => !moved.has(block.id));
  const restIndex = new Map(rest.map((block, index) => [block.id, index]));
  const staying = blocks.filter((block) => !block.dragged);
  return {
    blocks,
    ghostShells: dragged.filter((block) => block.top - first.top < viewport).map((block) => block.shell),
    ghost: { top: first.top + origin.y, left: first.left + origin.x, width: rightmost(dragged) - first.left },
    draggedLeft: first.left + first.indent * step,
    right: rightmost(blocks),
    indentStep: step,
    toIndex: (gap) => (gap < staying.length ? (restIndex.get(staying[gap].id) ?? rest.length) : rest.length),
  };
}
