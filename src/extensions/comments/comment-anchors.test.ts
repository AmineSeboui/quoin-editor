import { applyTransaction, coreExtensions, undo } from '../../engine';
import { buildState } from '../../engine/test-support/build-state';
import { md, startEditor } from '../../engine/test-support/editor-fixtures';
import { anchorText, commentAnchors, commentIdsAt, threadRemoval } from './comment-anchors';

const span = (id: string, inner: string) => `<span data-comment="${id}">${inner}</span>`;
const anchorsOf = (...lines: string[]) => commentAnchors(buildState(lines).doc);

describe('the extent of a comment anchor', () => {
  it('runs over the text its mark covers, whatever other marks split it', () => {
    expect(anchorsOf(`say ${span('c1', 'a **bold** word')} here`).get('c1')).toEqual([
      { block: 'b0', region: 'text', from: 4, to: 15 },
    ]);
  });

  it('keeps each of two overlapping anchors whole', () => {
    const anchors = anchorsOf(`${span('c1', `ab${span('c2', 'cd')}`)}${span('c2', 'ef')}`);
    expect(anchors.get('c1')).toEqual([{ block: 'b0', region: 'text', from: 0, to: 4 }]);
    expect(anchors.get('c2')).toEqual([{ block: 'b0', region: 'text', from: 2, to: 6 }]);
  });

  it('has a part in each block it was made across, in document order, and a part on each side of a gap', () => {
    const anchors = anchorsOf(`one ${span('c1', 'two')}`, `${span('c1', 'three')} four ${span('c1', 'five')}`);
    expect(anchors.get('c1')).toEqual([
      { block: 'b0', region: 'text', from: 4, to: 7 },
      { block: 'b1', region: 'text', from: 0, to: 5 },
      { block: 'b1', region: 'text', from: 11, to: 15 },
    ]);
  });

  it('is gone once its text is', () => {
    expect(anchorsOf('nothing here').size).toBe(0);
  });

  it('is read once per document', () => {
    const { doc } = buildState([span('c1', 'x')]);
    expect(commentAnchors(doc)).toBe(commentAnchors(doc));
  });

  it('names the text it covers, its parts joined by a space', () => {
    const state = buildState([`one ${span('c1', 'two')}`, `${span('c1', 'three')} four`]);
    expect(anchorText(state.doc, commentAnchors(state.doc).get('c1') ?? [])).toBe('two three');
  });
});

describe('the comments at a caret', () => {
  const { doc } = buildState([`a ${span('c1', `bc${span('c2', 'de')}`)} f`]);
  const at = (offset: number) => commentIdsAt(doc, { block: 'b0', region: 'text', offset });

  it('are those of the characters on either side of it', () => {
    expect(at(3)).toEqual(['c1']);
    expect(at(5)).toEqual(['c1', 'c2']);
    expect(at(2)).toEqual(['c1']);
    expect(at(6)).toEqual(['c1', 'c2']);
  });

  it('are none outside every anchor', () => {
    expect(at(0)).toEqual([]);
    expect(at(8)).toEqual([]);
    expect(commentIdsAt(doc, { block: 'gone', region: 'text', offset: 0 })).toEqual([]);
  });
});

describe('resolving a thread', () => {
  it('removes its marks from every block in one transaction, and only its own', () => {
    const state = buildState([`${span('c1', `ab${span('c2', 'cd')}`)}`, `x ${span('c1', 'y')}`]);
    const tr = threadRemoval(state, 'c1');
    expect(tr.steps).toHaveLength(2);
    const anchors = commentAnchors(applyTransaction(state, tr).doc);
    expect(anchors.has('c1')).toBe(false);
    expect(anchors.get('c2')).toEqual([{ block: 'b0', region: 'text', from: 2, to: 4 }]);
  });

  it('does nothing for a thread with no text left', () => {
    expect(threadRemoval(buildState(['plain']), 'c1').docChanged).toBe(false);
  });

  it('comes back whole with one undo', () => {
    const { editor } = startEditor([md('a', span('c1', 'one')), md('b', span('c1', 'two'))], {
      extensions: coreExtensions(),
    });
    editor.commands.setSelection({
      kind: 'text',
      anchor: { block: 'a', region: 'text', offset: 0 },
      head: { block: 'a', region: 'text', offset: 0 },
    });
    editor.dispatch(threadRemoval(editor.state, 'c1'));
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual(['one', 'two']);
    undo(editor.state, (tr) => editor.dispatch(tr));
    expect(editor.getBlocks().map((block) => block.data.markdown)).toEqual([span('c1', 'one'), span('c1', 'two')]);
  });
});
