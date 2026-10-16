import { defineExtension, type Command, type Extension } from '../../engine';

export type VoidEditing = {
  readonly extension: Extension;
  register(blockId: string, start: () => void): () => void;
};

// Keymaps run highest priority first, so this Enter is tried before the core one, which inserts a paragraph after a
// node-selected block.
const ABOVE_CORE_KEYS = 200;

/** Enter on a node-selected block opens its editor, once a drawn void block has registered how to open it. */
export function createVoidEditing(): VoidEditing {
  const starters = new Map<string, () => void>();
  const openEditor: Command = (state, dispatch) => {
    const { selection } = state;
    const start = selection?.kind === 'node' ? starters.get(selection.block) : undefined;
    if (start === undefined) return false;
    if (dispatch) start();
    return true;
  };
  return {
    extension: defineExtension({ name: 'void-editing', priority: ABOVE_CORE_KEYS, keymap: { Enter: openEditor } }),
    register(blockId, start) {
      starters.set(blockId, start);
      return () => {
        if (starters.get(blockId) === start) starters.delete(blockId);
      };
    },
  };
}
