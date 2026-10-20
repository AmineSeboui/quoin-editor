import { coreExtensions, createEditor, textSelection, type QuoinBlock } from '../engine';
import { insertBlocks, insertBlockToWrite } from './insert-blocks';
import { OPEN_EDITOR } from './void/void-editing';

const md = (id: string, markdown: string, indent?: number): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent === undefined ? {} : { indent }),
});
const file = { type: 'FILE', attrs: { storageKey: 'notes.pdf', filename: 'notes.pdf', size: 3 } };
const image = { type: 'IMAGE', attrs: { storageKey: 'cat.png', alt: '' } };

function editorWith(blocks: QuoinBlock[], caret?: { block: string; offset: number }) {
  const editor = createEditor({ blocks, onChange: () => {}, extensions: coreExtensions() });
  if (caret) editor.dispatch(editor.createTransaction().setSelection(textSelection({ ...caret, region: 'text' })));
  const metas: unknown[] = [];
  editor.subscribe((_state, tr) => metas.push(tr?.getMeta(OPEN_EDITOR)));
  const run = (command: ReturnType<typeof insertBlocks>) => command(editor.state, editor.dispatch);
  const shape = () => editor.getBlocks().map((block) => `${block.type}:${block.indent ?? 0}`);
  return { editor, metas, run, shape };
}

describe('insertBlocks', () => {
  it('puts the blocks after the anchor and the blocks nested under it, at its indent, then an empty line', () => {
    const { editor, run, shape } = editorWith([md('a', 'one', 1), md('c', 'child', 2), md('b', 'two')]);
    expect(run(insertBlocks([image, file], 'line', 'a'))).toBe(true);
    expect(shape()).toEqual(['MARKDOWN:1', 'MARKDOWN:2', 'IMAGE:1', 'FILE:1', 'MARKDOWN:1', 'MARKDOWN:0']);
    const line = editor.getBlocks()[4];
    expect(line.data).toEqual({ markdown: '' });
    expect(editor.state.selection).toEqual(textSelection({ block: line.id, region: 'text', offset: 0 }));
  });

  it('leaves the selection where it was and never fills an empty paragraph when the writer stays', () => {
    const { editor, run, shape } = editorWith([md('e', ''), md('b', 'two')], { block: 'b', offset: 2 });
    const before = editor.state.selection;
    run(insertBlocks([file], 'stay', 'e'));
    expect(shape()).toEqual(['MARKDOWN:0', 'FILE:0', 'MARKDOWN:0']);
    expect(editor.state.selection).toBe(before);
  });

  it('fills an empty document, then gives the caret an empty line after the blocks', () => {
    const { editor, run } = editorWith([]);
    expect(run(insertBlocks([file], 'line', null))).toBe(true);
    expect(editor.getBlocks().map((block) => block.type)).toEqual(['FILE', 'MARKDOWN']);
    expect(editor.state.selection).toMatchObject({ kind: 'text', head: { block: editor.getBlocks()[1].id } });
  });

  it('inserts nothing for an anchor that is gone, or without one in a document that has blocks', () => {
    const { run, shape } = editorWith([md('a', 'one')]);
    expect(run(insertBlocks([file], 'line', 'missing'))).toBe(false);
    expect(run(insertBlocks([file], 'line', null))).toBe(false);
    expect(run(insertBlocks([], 'line', 'a'))).toBe(false);
    expect(shape()).toEqual(['MARKDOWN:0']);
  });

  it('marks the transaction that lands on a block for its editor to open', () => {
    const { editor, metas, run } = editorWith([md('a', 'one')], { block: 'a', offset: 3 });
    run(insertBlocks([file], 'editor'));
    const added = editor.getBlocks()[1];
    expect(editor.state.selection).toEqual({ kind: 'node', block: added.id });
    expect(metas.at(-1)).toBe(added.id);
  });
});

describe('insertBlockToWrite', () => {
  it('lands a text block in its text, after the selection block', () => {
    const { editor, run } = editorWith([md('a', 'one')], { block: 'a', offset: 3 });
    run(insertBlockToWrite({ type: 'CALLOUT', attrs: { tone: 'tip' } }, false));
    const callout = editor.getBlocks()[1];
    expect(callout).toEqual({ id: callout.id, type: 'CALLOUT', data: { tone: 'tip', body: '' } });
    expect(editor.state.selection).toEqual(textSelection({ block: callout.id, region: 'body', offset: 0 }));
  });

  it('lands on a block drawn without text, with an editor or on a line after it, never in a region', () => {
    const { editor, run } = editorWith([md('a', 'one')], { block: 'a', offset: 3 });
    run(insertBlockToWrite(image, true));
    expect(editor.state.selection).toEqual({ kind: 'node', block: editor.getBlocks()[1].id });
    run(insertBlockToWrite(image, false));
    expect(editor.getBlocks().map((block) => block.type)).toEqual(['MARKDOWN', 'IMAGE', 'IMAGE', 'MARKDOWN']);
    expect(editor.state.selection).toMatchObject({ kind: 'text', head: { block: editor.getBlocks()[3].id } });
  });
});
