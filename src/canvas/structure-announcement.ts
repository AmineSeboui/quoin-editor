import type { EngineDoc, Transaction } from '../engine';
import { LINE_JOIN } from '../engine/commands/line-join';
import { LINE_SPLIT } from '../engine/commands/line-split';
import type { QuoinLabels } from '../i18n/labels';
import { drawnBlockCount } from '../view/navigation/visible-blocks';

const DELETION_STEPS: ReadonlySet<string> = new Set(['removeBlocks', 'setIndent']);

type Position = readonly [position: number, total: number];

function drawnPosition(doc: EngineDoc, blockId: string): Position {
  const index = doc.index.get(blockId) ?? 0;
  return [drawnBlockCount(doc, 0, index) + 1, drawnBlockCount(doc)];
}

/** Where a block now is among the blocks the canvas draws, and of how many. */
export function blockMovedMessage(doc: EngineDoc, blockId: string, labels: QuoinLabels): string {
  return labels.blockMoved(...drawnPosition(doc, blockId));
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

// The first block the transaction inserted, when it removed none: a delete of whole blocks through text inserts the
// empty paragraph that takes their place.
function insertedBlock(tr: Transaction): string | null {
  if (tr.getMeta(LINE_SPLIT) === true || tr.steps.some((step) => step.stepType === 'removeBlocks')) return null;
  const inserted = tr.steps.flatMap((step) => {
    const { blocks } = step.toJSON();
    return step.stepType === 'insertBlocks' && Array.isArray(blocks) ? (blocks as { id: string }[]) : [];
  });
  return inserted.find((block) => tr.doc.index.has(block.id))?.id ?? null;
}

/**
 * What the live region says about a command that moved, deleted or inserted blocks, or null for any other change. A
 * line that Backspace or Delete joins to its neighbour, or that Enter splits off or opens, is typing, and changes that
 * undo, paste or a collaborator made are not the writer's own command.
 */
export function structureAnnouncement(tr: Transaction, labels: QuoinLabels, undoKeys: string): string | null {
  if (tr.origin !== 'command' || tr.getMeta(LINE_JOIN) === true) return null;
  const moved = movedBlock(tr);
  if (moved !== null) return blockMovedMessage(tr.doc, moved, labels);
  const deleted = deletedCount(tr);
  if (deleted > 0) return `${labels.blockDeleted(deleted)}. ${labels.undoHint(undoKeys)}`;
  const inserted = insertedBlock(tr);
  return inserted === null ? null : labels.blockInserted(...drawnPosition(tr.doc, inserted));
}
