import { defineExtension, type Command, type Extension, type Transaction } from '../../engine';

/** The meta key of a transaction that inserted a block whose editor opens as soon as the block is drawn. */
export const OPEN_EDITOR = 'openEditor';

export type VoidEditing = {
  readonly extension: Extension;
  register(blockId: string, start: () => void): () => void;
};

// Keymaps run highest priority first, so this Enter is tried before the core one, which inserts a paragraph after a
// node-selected block.
const ABOVE_CORE_KEYS = 200;

/**
 * Enter on a node-selected block opens its editor, once a drawn void block has registered how to open it. A block a
 * transaction inserted with `OPEN_EDITOR` opens when it registers, which is after the transaction.
 */
export function createVoidEditing(): VoidEditing {
  const starters = new Map<string, () => void>();
  let opening: string | null = null;
  const openEditor: Command = (state, dispatch) => {
    const { selection } = state;
    const start = selection?.kind === 'node' ? starters.get(selection.block) : undefined;
    if (start === undefined) return false;
    if (dispatch) start();
    return true;
  };
  const onTransaction = (tr: Transaction) => {
    const blockId = tr.getMeta(OPEN_EDITOR);
    if (typeof blockId !== 'string') return;
    const start = starters.get(blockId);
    opening = start === undefined ? blockId : null;
    start?.();
  };
  return {
    extension: defineExtension({
      name: 'void-editing',
      priority: ABOVE_CORE_KEYS,
      keymap: { Enter: openEditor },
      onTransaction,
    }),
    register(blockId, start) {
      starters.set(blockId, start);
      if (opening === blockId) {
        opening = null;
        start();
      }
      return () => {
        if (starters.get(blockId) === start) starters.delete(blockId);
      };
    },
  };
}
