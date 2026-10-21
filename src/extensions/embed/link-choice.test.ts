import {
  coreExtensions,
  createEditor,
  defineExtension,
  insertBlocksStep,
  redo,
  removeBlocksStep,
  setAttrsStep,
  textSelection,
  undo,
  type Editor,
  type QuoinBlock,
} from '../../engine';
import { blockById } from '../../engine/model/doc';
import { linkChoice, linkChoicePlugin, pasteLinkChoice, replaceLink } from './link-choice';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
const URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const blockOf = (editor: Editor, id: string) => blockById(editor.state.doc, id)!;

function editorWith(blocks: QuoinBlock[], caret: { block: string; offset: number }) {
  const choice = defineExtension({ name: 'embed', plugins: [linkChoicePlugin], pasteRules: [pasteLinkChoice] });
  const editor = createEditor({ blocks, onChange: () => {}, extensions: [...coreExtensions(), choice] });
  editor.dispatch(editor.createTransaction().setSelection(textSelection({ ...caret, region: 'text' })));
  const markdown = () => editor.getBlocks().map((block) => block.data.markdown ?? block.type);
  return { editor, markdown, choice: () => linkChoice(editor.state) };
}

describe('a link pasted alone on an empty line', () => {
  it('is pasted as a link, and offered as an embed or a bookmark', () => {
    const { editor, markdown, choice } = editorWith([md('a', ''), md('b', 'after')], { block: 'a', offset: 0 });
    expect(editor.paste({ text: `  ${URL}\n` })).toBe(true);
    expect(markdown()).toEqual([`<${URL}>`, 'after']);
    expect(choice()).toEqual({ block: 'a', href: URL });
    const plain = createEditor({ blocks: [md('a', ''), md('b', 'after')], extensions: coreExtensions() });
    plain.dispatch(plain.createTransaction().setSelection(textSelection({ block: 'a', region: 'text', offset: 0 })));
    plain.paste({ text: `  ${URL}\n` });
    expect(editor.getBlocks()).toEqual(plain.getBlocks());
  });

  it('is offered too in a document with no line yet', () => {
    const choice = defineExtension({ name: 'embed', plugins: [linkChoicePlugin], pasteRules: [pasteLinkChoice] });
    const editor = createEditor({ blocks: [], extensions: [...coreExtensions(), choice] });
    expect(editor.paste({ text: URL })).toBe(true);
    const [line] = editor.getBlocks();
    expect(line.data).toEqual({ markdown: `<${URL}>` });
    expect(linkChoice(editor.state)).toEqual({ block: line.id, href: URL });
  });

  it.each([
    ['a line with text', [md('a', 'Watch ')], 6, URL],
    ['a heading', [md('a', '# ')], 0, URL],
    ['an empty line', [md('a', '')], 0, `${URL} now`],
    ['an empty line', [md('a', '')], 0, `${URL}.`],
    ['an empty line', [md('a', '')], 0, 'mailto:a@b.test'],
  ])('is pasted as usual, and offered as nothing, on %s or followed by more', (_, blocks, offset, text) => {
    const { editor, choice } = editorWith(blocks, { block: 'a', offset });
    editor.paste({ text });
    expect(choice()).toBeNull();
  });

  it('is still offered through changes to other blocks, and no longer once its own line changes', () => {
    const { editor, choice } = editorWith([md('a', ''), md('b', 'after')], { block: 'a', offset: 0 });
    editor.paste({ text: URL });
    editor.dispatch(editor.createTransaction().step(setAttrsStep('b', { align: 'center' })));
    editor.dispatch(editor.createTransaction().step(insertBlocksStep(2, [{ ...blockOf(editor, 'b'), id: 'c' }])));
    expect(choice()).toEqual({ block: 'a', href: URL });
    editor.dispatch(editor.createTransaction().step(setAttrsStep('a', { align: 'center' })));
    expect(choice()).toBeNull();
  });

  it('is offered no longer once its line is removed', () => {
    const { editor, choice } = editorWith([md('a', ''), md('b', 'after')], { block: 'a', offset: 0 });
    editor.paste({ text: URL });
    const caretBelow = textSelection({ block: 'b', region: 'text', offset: 0 });
    editor.dispatch(editor.createTransaction().step(removeBlocksStep(0, 1)).setSelection(caretBelow));
    expect(choice()).toBeNull();
  });

  it('is offered no longer once the text changes or the caret moves', () => {
    const typed = editorWith([md('a', '')], { block: 'a', offset: 0 });
    typed.editor.paste({ text: URL });
    typed.editor.insertText('!');
    expect(typed.choice()).toBeNull();

    const moved = editorWith([md('a', ''), md('b', 'after')], { block: 'a', offset: 0 });
    moved.editor.paste({ text: URL });
    moved.editor.dispatch(moved.editor.createTransaction().setSelection(textSelection({ block: 'b', region: 'text', offset: 0 })));
    expect(moved.choice()).toBeNull();
  });
});

describe('replacing a pasted link with a block', () => {
  it('puts the block above the emptied line, which keeps the caret, in one step that undo takes back', () => {
    const { editor, markdown, choice } = editorWith([md('a', ''), md('b', 'after')], { block: 'a', offset: 0 });
    editor.paste({ text: URL });
    expect(replaceLink('a', { type: 'EMBED', attrs: { url: URL, provider: 'youtube' } })(editor.state, editor.dispatch)).toBe(
      true,
    );
    const [embed] = editor.getBlocks();
    expect(embed).toEqual({ id: expect.any(String), type: 'EMBED', data: { url: URL, provider: 'youtube' } });
    expect(markdown()).toEqual(['EMBED', '', 'after']);
    expect(editor.state.selection).toEqual(textSelection({ block: 'a', region: 'text', offset: 0 }));
    expect(choice()).toBeNull();

    undo(editor.state, editor.dispatch);
    expect(markdown()).toEqual([`<${URL}>`, 'after']);
    expect(editor.state.selection).toEqual(textSelection({ block: 'a', region: 'text', offset: URL.length }));
    expect(choice()).toBeNull();
    redo(editor.state, editor.dispatch);
    expect(markdown()).toEqual(['EMBED', '', 'after']);
  });

  it('refuses a line that is gone or is no paragraph', () => {
    const { editor } = editorWith([md('a', '# Title')], { block: 'a', offset: 0 });
    const bookmark = { type: 'BOOKMARK', attrs: { url: URL } };
    expect(replaceLink('a', bookmark)(editor.state)).toBe(false);
    expect(replaceLink('gone', bookmark)(editor.state)).toBe(false);
  });
});
