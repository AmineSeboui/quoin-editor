import { describe, expect, it } from 'vitest';
import { undoDepth } from '../state/history';
import { buildState, markdownOf, run } from '../test-support/build-state';
import { caret, md, mod, range, startEditor } from '../test-support/editor-fixtures';
import { setTextAlign } from './block-style';
import { clearFormatting, setLink, setMark, unsetLink, unsetMark } from './marks';
import { setBlockType } from './turn-into';

const select = (markdown: string, from: number, to: number) =>
  buildState([markdown], { anchor: { block: 0, offset: from }, head: { block: 0, offset: to } });
const at = (markdown: string, offset: number) => buildState([markdown], { block: 0, offset });

describe('commands that change nothing report it', () => {
  it('Mod+Alt+0 on a paragraph is not handled and leaves no trace', () => {
    const { editor, onChange } = startEditor([md('a', 'hello')]);
    editor.commands.setSelection(caret('a', 2));
    expect(editor.handleKey(mod('0', { altKey: true, code: 'Digit0' }))).toBe(false);
    expect(editor.can().setBlockType('MARKDOWN', { kind: 'paragraph' })).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(undoDepth(editor.state)).toBe(0);
  });

  it('still converts a heading to a paragraph, then reports the second attempt', () => {
    const state = at('# Title', 2);
    const paragraph = run(state, setBlockType('MARKDOWN', { kind: 'paragraph' }));
    expect(paragraph.ok).toBe(true);
    expect(markdownOf(paragraph.state)).toEqual(['Title']);
    expect(run(paragraph.state, setBlockType('MARKDOWN', { kind: 'paragraph' })).ok).toBe(false);
    expect(run(at('## Title', 2), setBlockType('MARKDOWN', { kind: 'heading', level: 2 })).ok).toBe(false);
  });

  it('does not align a block that already has that alignment, or unalign an unaligned one', () => {
    const plain = at('hello', 1);
    expect(run(plain, setTextAlign(null)).ok).toBe(false);
    const centered = run(plain, setTextAlign('center'));
    expect(centered.ok).toBe(true);
    expect(run(centered.state, setTextAlign('center')).ok).toBe(false);
    expect(run(centered.state, setTextAlign(null)).ok).toBe(true);
  });

  it('does not set a mark over a range that already has it', () => {
    expect(run(select('**bold** x', 0, 4), setMark('bold')).ok).toBe(false);
    expect(run(select('**bold** x', 0, 6), setMark('bold')).ok).toBe(true);
    expect(run(at('**bold**', 2), setMark('bold')).ok).toBe(false);
    expect(run(at('plain', 2), setMark('bold')).ok).toBe(true);
  });

  it('does not unset a mark that is not there', () => {
    expect(run(select('plain', 0, 5), unsetMark('bold')).ok).toBe(false);
    expect(run(at('plain', 2), unsetMark('bold')).ok).toBe(false);
    expect(run(select('**bold**', 0, 4), unsetMark('bold')).ok).toBe(true);
  });

  it('does not unlink text without a link, or set the link it already has', () => {
    expect(run(select('plain', 0, 5), unsetLink).ok).toBe(false);
    expect(run(select('[a](https://a.b)', 0, 1), unsetLink).ok).toBe(true);
    expect(run(select('[abc](https://a.b)', 0, 3), setLink('https://a.b')).ok).toBe(false);
    expect(run(select('[abc](https://a.b)', 0, 3), setLink('https://c.d')).ok).toBe(true);
  });

  it('does not clear formatting when there is nothing to clear', () => {
    expect(run(select('plain', 0, 5), clearFormatting).ok).toBe(false);
    expect(run(select('[a](https://a.b)', 0, 1), clearFormatting).ok).toBe(false);
    expect(run(at('plain', 2), clearFormatting).ok).toBe(false);
    expect(run(select('**a**', 0, 1), clearFormatting).ok).toBe(true);
  });

  it('emits no change and records no undo item for any of them', () => {
    const { editor, onChange } = startEditor([md('a', '**bold** [l](https://a.b) plain')]);
    editor.commands.setSelection(range('a', 0, 4));
    expect(editor.commands.setMark('bold')).toBe(false);
    expect(editor.can().setMark('bold')).toBe(false);
    editor.commands.setSelection(range('a', 14, 18));
    expect(editor.commands.unsetLink()).toBe(false);
    expect(editor.commands.clearFormatting()).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
    expect(undoDepth(editor.state)).toBe(0);
  });
});
