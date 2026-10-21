import { blockRangeSelection, nodeSelection, type QuoinBlock } from '../../engine';
import { caret, startEditor } from '../../engine/test-support/editor-fixtures';
import { DIMMED, focusDecorations } from './focus-decorations';

const md = (id: string, indent = 0): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown: id }, indent });

function dimmedIn(blocks: QuoinBlock[], select: (editor: ReturnType<typeof startEditor>['editor']) => void) {
  const { editor } = startEditor(blocks);
  select(editor);
  return focusDecorations(editor.state).map((decoration) => {
    expect(decoration).toMatchObject({ kind: 'block', attrs: DIMMED });
    return decoration.block;
  });
}

const flat = [md('a'), md('b'), md('c')];

describe('the focus mode decorations', () => {
  it('dim every block but the one holding the caret', () => {
    expect(dimmedIn(flat, (editor) => editor.commands.setSelection(caret('b', 0)))).toEqual(['a', 'c']);
    expect(dimmedIn(flat, (editor) => editor.commands.setSelection(caret('a', 1)))).toEqual(['b', 'c']);
  });

  it('keep every block a selection across blocks touches undimmed', () => {
    const across = {
      kind: 'text' as const,
      anchor: { block: 'c', region: 'text', offset: 0 },
      head: { block: 'b', region: 'text', offset: 1 },
    };
    expect(dimmedIn(flat, (editor) => editor.commands.setSelection(across))).toEqual(['a']);
    expect(dimmedIn(flat, (editor) => editor.commands.setSelection(blockRangeSelection('a', 'b')))).toEqual(['c']);
    expect(dimmedIn(flat, (editor) => editor.commands.setSelection(nodeSelection('c')))).toEqual(['a', 'b']);
  });

  it('keep the ancestors of the block holding the caret undimmed', () => {
    const nested = [md('top'), md('parent'), md('child', 1), md('grandchild', 2), md('cousin', 1), md('after')];
    const dimmed = dimmedIn(nested, (editor) => editor.commands.setSelection(caret('grandchild', 0)));
    expect(dimmed).toEqual(['top', 'cousin', 'after']);
  });

  it('dim nothing without a selection, and give the same array for the same document and selection', () => {
    const { editor } = startEditor(flat);
    editor.commands.setSelection(caret('a', 0));
    const first = focusDecorations(editor.state);
    editor.commands.setSelection(caret('a', 1));
    expect(focusDecorations(editor.state)).toBe(first);
    expect(focusDecorations({ ...editor.state, selection: null })).toEqual([]);
  });
});
