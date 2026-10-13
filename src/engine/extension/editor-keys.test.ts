import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { caret, key, md, mod, range, startEditor } from '../test-support/editor-fixtures';

const markdownOf = (blocks: QuoinBlock[]) => blocks.map((block) => block.data.markdown);

describe('the core keymap', () => {
  it('splits on Enter and inserts a hard break on Shift-Enter', () => {
    const { editor } = startEditor([md('a', 'onetwo')]);
    editor.commands.setSelection(caret('a', 3));
    expect(editor.handleKey(key('Enter', { shiftKey: true }))).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual(['one\\\ntwo']);
    expect(editor.handleKey(key('Enter'))).toBe(true);
    expect(editor.getBlocks()).toHaveLength(2);
  });

  it('turns a fence into a code block on Enter', () => {
    const { editor } = startEditor([md('a', '')]);
    editor.insertText('```ts');
    expect(editor.handleKey(key('Enter'))).toBe(true);
    expect(editor.getBlocks()[0]).toMatchObject({ type: 'CODE', data: { language: 'ts' } });
  });

  it('undoes an input rule on Backspace, then deletes', () => {
    const { editor } = startEditor([md('a', '')]);
    editor.insertText('#');
    editor.insertText(' ');
    expect(markdownOf(editor.getBlocks())).toEqual(['# ']);
    expect(editor.handleKey(key('Backspace'))).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual(['\\#&#32;']);
    expect(editor.handleKey(key('Backspace'))).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual(['\\#']);
  });

  it('deletes instead of undoing an input rule once the caret has moved elsewhere', () => {
    const { editor } = startEditor([md('a', ''), md('b', 'two')]);
    editor.insertText('#');
    editor.insertText(' ');
    editor.commands.setSelection(caret('b', 3));
    expect(editor.handleKey(key('Backspace'))).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual(['# ', 'tw']);
  });

  it('deletes forward and merges with the next block', () => {
    const { editor } = startEditor([md('a', 'one'), md('b', 'two')]);
    editor.commands.setSelection(caret('a', 3));
    expect(editor.handleKey(key('Delete'))).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual(['onetwo']);
  });

  it('indents on Tab and outdents on Shift-Tab', () => {
    const { editor } = startEditor([md('a', '- one'), md('b', '- two')]);
    editor.commands.setSelection(caret('b', 1));
    expect(editor.handleKey(key('Tab'))).toBe(true);
    expect(editor.getBlocks()[1].indent).toBe(1);
    expect(editor.handleKey(key('Tab', { shiftKey: true }))).toBe(true);
    expect(editor.getBlocks()[1].indent).toBeUndefined();
  });

  it('selects the text, then the blocks, on Mod-a and the block on Escape', () => {
    const { editor } = startEditor([md('a', 'one'), md('b', 'two')]);
    editor.commands.setSelection(caret('a', 1));
    editor.handleKey(mod('a'));
    expect(editor.state.selection).toEqual(range('a', 0, 3));
    editor.handleKey(mod('a'));
    expect(editor.state.selection).toEqual({ kind: 'blocks', anchor: 'a', head: 'b' });
    editor.commands.setSelection(caret('b', 1));
    editor.handleKey(key('Escape'));
    expect(editor.state.selection).toEqual({ kind: 'blocks', anchor: 'b', head: 'b' });
  });

  it('moves and duplicates blocks', () => {
    const { editor } = startEditor([md('a', 'one'), md('b', 'two')]);
    editor.commands.setSelection(caret('a', 1));
    expect(editor.handleKey(mod('ArrowDown', { shiftKey: true }))).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual(['two', 'one']);
    expect(editor.handleKey(mod('ArrowUp', { shiftKey: true }))).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual(['one', 'two']);
    expect(editor.handleKey(mod('d'))).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual(['one', 'one', 'two']);
    expect(editor.getBlocks()[1].id).toBe('n1');
  });

  it('sets headings and lists from the Alt and Shift digit shortcuts, reading the physical key', () => {
    const { editor } = startEditor([md('a', 'one')]);
    editor.commands.setSelection(caret('a', 1));
    expect(editor.handleKey({ ...mod('\u2122', { altKey: true }), code: 'Digit2' })).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual(['## one']);
    expect(editor.handleKey({ ...mod('&', { shiftKey: true }), code: 'Digit7' })).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual(['1. one']);
    editor.handleKey({ ...mod('*', { shiftKey: true }), code: 'Digit8' });
    expect(markdownOf(editor.getBlocks())).toEqual(['- one']);
    editor.handleKey({ ...mod('(', { shiftKey: true }), code: 'Digit9' });
    expect(markdownOf(editor.getBlocks())).toEqual(['- [ ] one']);
    editor.handleKey({ ...mod('\u00BA', { altKey: true }), code: 'Digit0' });
    expect(markdownOf(editor.getBlocks())).toEqual(['one']);
  });

  it.each([
    ['b', {}, 'bold', '**one**'],
    ['i', {}, 'italic', '_one_'],
    ['u', {}, 'underline', '<u>one</u>'],
    ['S', { shiftKey: true }, 'strike', '~~one~~'],
    ['e', {}, 'code', '`one`'],
    ['H', { shiftKey: true }, 'highlight', '<mark>one</mark>'],
  ])('toggles a mark on Mod-%s', (name, extra, mark, markdown) => {
    const { editor } = startEditor([md('a', 'one')]);
    editor.commands.setSelection(range('a', 0, 3));
    expect(editor.handleKey(mod(name, extra))).toBe(true);
    expect(editor.isActive(mark)).toBe(true);
    expect(markdownOf(editor.getBlocks())).toEqual([markdown]);
  });

  it('undoes and redoes with Mod-z, Mod-Shift-z and Mod-y', () => {
    const { editor } = startEditor([md('a', 'one')]);
    editor.commands.setSelection(caret('a', 3));
    editor.insertText('!');
    editor.handleKey(mod('z'));
    expect(markdownOf(editor.getBlocks())).toEqual(['one']);
    editor.handleKey(mod('Z', { shiftKey: true }));
    expect(markdownOf(editor.getBlocks())).toEqual(['one!']);
    editor.handleKey(mod('z'));
    editor.handleKey(mod('y'));
    expect(markdownOf(editor.getBlocks())).toEqual(['one!']);
  });

  it('uses Ctrl for Mod away from a Mac and leaves other keys alone', () => {
    const { editor } = startEditor([md('a', 'one')], { isMac: false });
    editor.commands.setSelection(range('a', 0, 3));
    expect(editor.handleKey(mod('b'))).toBe(false);
    expect(editor.handleKey(key('b', { ctrlKey: true }))).toBe(true);
    expect(editor.handleKey(key('x'))).toBe(false);
  });

  it.each([
    ['Mod-Shift-8', mod('8', { shiftKey: true }), '- let a = 1z'],
    ['Mod-Shift-9', mod('9', { shiftKey: true }), '- [ ] let a = 1z'],
    ['Mod-Alt-2', mod('2', { altKey: true }), '## let a = 1z'],
  ])('keeps typing after %s on a node-selected code block', (_name, shortcut, expected) => {
    const { editor } = startEditor([
      md('a', 'x'),
      { id: 'c', type: 'CODE', data: { language: 'js', code: 'let a = 1' } },
    ]);
    editor.commands.setSelection({ kind: 'node', block: 'c' });
    expect(editor.handleKey(shortcut)).toBe(true);
    expect(editor.state.selection?.kind).toBe('text');
    editor.insertText('z');
    expect(markdownOf(editor.getBlocks())).toEqual(['x', expected]);
  });
});
