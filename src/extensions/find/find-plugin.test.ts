import { coreExtensions, getPluginState, textSelection, type Editor } from '../../engine';
import { caret, md, startEditor } from '../../engine/test-support/editor-fixtures';
import { closeFind, openFind, replaceAll, replaceCurrent, setSearch, stepFind } from './find-commands';
import { findExtension } from './find-extension';
import { findKey } from './find-plugin';

const PLAIN = { caseSensitive: false, wholeWord: false, regex: false };

function editorWith(...lines: string[]) {
  const { editor } = startEditor(
    lines.map((line, i) => md(`p${i}`, line)),
    { extensions: [...coreExtensions(), findExtension()] },
  );
  const find = () => getPluginState(editor.state, findKey);
  const search = (query: string, options = {}) =>
    editor.dispatch(setSearch(editor.state, { ...PLAIN, ...options, query }));
  const step = (by: 1 | -1) => editor.dispatch(stepFind(editor.state, by));
  const current = () => {
    const { matches, current: index } = find();
    const match = matches[index];
    return match && `${match.block}:${match.from}`;
  };
  const texts = () => editor.getBlocks().map((block) => block.data.markdown);
  return { editor, find, search, step, current, texts };
}

const open = (editor: Editor) => openFind(editor.state, (tr) => editor.dispatch(tr));
const classes = (editor: Editor) =>
  editor
    .decorations()
    .flatMap((decoration) => (decoration.kind === 'inline' ? [`${decoration.from}:${decoration.attrs.class}`] : []));

describe('the find state', () => {
  it('starts from the first match at or after the caret, and steps through the matches both ways, wrapping', () => {
    const { editor, search, step, current } = editorWith('cat one', 'cat two', 'cat three');
    editor.commands.setSelection(caret('p1', 2));
    open(editor);
    search('cat');
    expect(current()).toBe('p2:0');
    step(1);
    expect(current()).toBe('p0:0');
    step(-1);
    step(-1);
    expect(current()).toBe('p1:0');
    expect(editor.state.selection).toEqual(caret('p1', 2));
  });

  it('draws every match, and the current one apart, only while the panel is open', () => {
    const { editor, search } = editorWith('a cat and a cat');
    expect(classes(editor)).toEqual([]);
    open(editor);
    search('cat');
    expect(classes(editor)).toEqual(['2:quoin-find-match quoin-find-current', '12:quoin-find-match']);
    editor.dispatch(closeFind(editor.state));
    expect(classes(editor)).toEqual([]);
  });

  it('starts with the text a selection inside one line covers', () => {
    const { editor, find } = editorWith('find this word');
    editor.commands.setSelection(
      textSelection({ block: 'p0', region: 'text', offset: 9 }, { block: 'p0', region: 'text', offset: 5 }),
    );
    open(editor);
    expect(find().search.query).toBe('this');
    expect(find().matches).toHaveLength(1);
  });

  it('keeps the query of a selection across lines or of a caret', () => {
    const { editor, find, search } = editorWith('one', 'two');
    open(editor);
    search('on');
    editor.dispatch(closeFind(editor.state));
    editor.commands.setSelection(
      textSelection({ block: 'p0', region: 'text', offset: 1 }, { block: 'p1', region: 'text', offset: 1 }),
    );
    open(editor);
    expect(find().search.query).toBe('on');
  });

  it('follows edits, keeping the current match the nearest at or after where it was', () => {
    const { editor, search, find, current } = editorWith('cat cat cat');
    open(editor);
    search('cat');
    editor.dispatch(stepFind(editor.state, 1));
    expect(current()).toBe('p0:4');
    editor.commands.setSelection(caret('p0', 0));
    editor.commands.insertText('cat ');
    expect(find().matches).toHaveLength(4);
    expect(current()).toBe('p0:8');
    editor.commands.setSelection(
      textSelection({ block: 'p0', region: 'text', offset: 8 }, { block: 'p0', region: 'text', offset: 9 }),
    );
    editor.commands.insertText('b');
    expect(find().matches).toHaveLength(3);
    expect(current()).toBe('p0:12');
  });

  it('reports the error of a pattern that cannot be read, and finds nothing for an empty query', () => {
    const { editor, search, find } = editorWith('a(b');
    open(editor);
    search('a(', { regex: true });
    expect(find()).toMatchObject({ error: expect.any(String), matches: [], current: -1 });
    search('');
    expect(find()).toMatchObject({ error: null, matches: [], current: -1 });
  });

  it('counts and draws at most 1,000 matches, and says when there are more', () => {
    const { editor, search, find } = editorWith('x'.repeat(600), 'x'.repeat(600));
    open(editor);
    search('x');
    expect(find().matches).toHaveLength(1000);
    expect(find().capped).toBe(true);
    expect(editor.decorations()).toHaveLength(1000);
  });
});

describe('replacing from the find state', () => {
  it('replaces the current match as its own step of history and moves to the next one', () => {
    const { editor, search, current, texts } = editorWith('a cat, a cat, a cat');
    open(editor);
    search('cat');
    editor.dispatch(stepFind(editor.state, 1));
    expect(replaceCurrent('dog')(editor.state, (tr) => editor.dispatch(tr))).toBe(true);
    expect(texts()).toEqual(['a cat, a dog, a cat']);
    expect(current()).toBe('p0:16');
    replaceCurrent('dog')(editor.state, (tr) => editor.dispatch(tr));
    expect(texts()).toEqual(['a cat, a dog, a dog']);
    expect(current()).toBe('p0:2');
    editor.commands.undo();
    expect(texts()).toEqual(['a cat, a dog, a cat']);
  });

  it('moves past a replacement that still matches', () => {
    const { editor, search, current, texts } = editorWith('a a');
    open(editor);
    search('a');
    replaceCurrent('aa')(editor.state, (tr) => editor.dispatch(tr));
    expect(texts()).toEqual(['aa a']);
    expect(current()).toBe('p0:3');
  });

  it('replaces every match, past the 1,000 it counts, in one step of history', () => {
    const { editor, search, find, texts } = editorWith('x'.repeat(600), 'x'.repeat(600));
    open(editor);
    search('x');
    expect(replaceAll('y')(editor.state, (tr) => editor.dispatch(tr))).toBe(true);
    expect(texts()).toEqual(['y'.repeat(600), 'y'.repeat(600)]);
    expect(find().matches).toEqual([]);
    editor.commands.undo();
    expect(texts()).toEqual(['x'.repeat(600), 'x'.repeat(600)]);
  });

  it('does nothing while the panel is closed or when the replacement equals each match', () => {
    const { editor, search } = editorWith('cat');
    const run = (command: ReturnType<typeof replaceAll>) => command(editor.state, (tr) => editor.dispatch(tr));
    expect(run(replaceAll('dog'))).toBe(false);
    expect(run(replaceCurrent('dog'))).toBe(false);
    open(editor);
    search('cat');
    expect(run(replaceAll('cat'))).toBe(false);
    expect(run(replaceCurrent('cat'))).toBe(false);
  });
});
