import type { Attrs, Editor, EditorState } from '../../engine';

const grouped = new WeakMap<EditorState, Map<string, Attrs>>();

/** The attributes the block decorations of the current state write on a block's element, grouped once per state. */
export function blockDecorationAttrs(editor: Editor, block: string): Attrs | undefined {
  const { state } = editor;
  let byBlock = grouped.get(state);
  if (byBlock === undefined) {
    byBlock = new Map();
    for (const decoration of editor.decorations()) {
      if (decoration.kind !== 'block') continue;
      byBlock.set(decoration.block, { ...byBlock.get(decoration.block), ...decoration.attrs });
    }
    grouped.set(state, byBlock);
  }
  return byBlock.get(block);
}
