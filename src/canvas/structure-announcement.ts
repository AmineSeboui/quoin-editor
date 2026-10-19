import type { EngineDoc, Transaction } from '../engine';
import { LINE_JOIN } from '../engine/commands/line-join';
import type { QuoinLabels } from '../i18n/labels';
import { drawnBlockCount } from '../view/navigation/visible-blocks';

const DELETION_STEPS: ReadonlySet<string> = new Set(['removeBlocks', 'setIndent']);

/** Where a block now is among the blocks the canvas draws, and of how many. */
export function blockMovedMessage(doc: EngineDoc, blockId: string, labels: QuoinLabels): string {
  const index = doc.index.get(blockId) ?? 0;
  return labels.blockMoved(drawnBlockCount(doc, 0, index) + 1, drawnBlockCount(doc));
}

function movedBlock(tr: Transaction): string | null {
  const at = tr.steps.findIndex((step) => step.stepType === 'moveBlocks');
  if (at < 0) return null;
  const { from } = tr.steps[at].toJSON();
  return typeof from === 'number' ? (tr.docs[at].blocks[from]?.id ?? null) : null;
}

// Whole blocks removed and nothing else changed but their indents: a range delete through text also edits text.
function deletedCount(tr: Transaction): number {
  if (!tr.steps.every((step) => DELETION_STEPS.has(step.stepType))) return 0;
  return tr.steps.reduce((deleted, step, i) => {
    const { index, count } = step.toJSON();
    if (step.stepType !== 'removeBlocks' || typeof index !== 'number' || typeof count !== 'number') return deleted;
    return deleted + drawnBlockCount(tr.docs[i], index, index + count);
  }, 0);
}

/**
 * What the live region says about a command that moved or deleted blocks, or null for any other change. A line that
 * Backspace or Delete joins to its neighbour is typing, and changes that undo, paste or a collaborator made are not
 * the writer's own command.
 */
export function structureAnnouncement(tr: Transaction, labels: QuoinLabels, undoKeys: string): string | null {
  if (tr.origin !== 'command' || tr.getMeta(LINE_JOIN) === true) return null;
  const moved = movedBlock(tr);
  if (moved !== null) return blockMovedMessage(tr.doc, moved, labels);
  const deleted = deletedCount(tr);
  return deleted > 0 ? `${labels.blockDeleted(deleted)}. ${labels.undoHint(undoKeys)}` : null;
}
