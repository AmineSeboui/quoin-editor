import type { KeyLike } from '../../engine';
import { codeKeyAction } from './code-keys';
import type { CodeField } from './code-edits';

const field = (value: string, start: number, end = start): CodeField => ({ value, start, end });

function key(name: string, modifiers: Partial<KeyLike> = {}): KeyLike {
  return { key: name, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, ...modifiers };
}

const onPc = (event: KeyLike, at: CodeField) => codeKeyAction(event, at, false);

describe('codeKeyAction', () => {
  it('indents with Tab: two spaces at a caret, every touched line for a selection', () => {
    expect(onPc(key('Tab'), field('ab', 1))).toEqual({ kind: 'edit', field: field('a  b', 3) });
    expect(onPc(key('Tab'), field('a\nb', 0, 3))).toEqual({ kind: 'edit', field: field('  a\n  b', 0, 7) });
  });

  it('outdents with Shift+Tab, and still takes the key on a line with nothing to outdent', () => {
    expect(onPc(key('Tab', { shiftKey: true }), field('  a', 3))).toEqual({ kind: 'edit', field: field('a', 1) });
    expect(onPc(key('Tab', { shiftKey: true }), field('a', 1))).toEqual({ kind: 'edit', field: field('a', 1) });
  });

  it('keeps the indentation of the line on Enter, and leaves Shift+Enter to the text area', () => {
    expect(onPc(key('Enter'), field('  a', 3))).toEqual({ kind: 'edit', field: field('  a\n  ', 6) });
    expect(onPc(key('Enter', { shiftKey: true }), field('  a', 3))).toBeNull();
  });

  it('leaves the block up from the first line and down from the last, a line move anywhere else', () => {
    const code = 'one\ntwo\nthree';
    expect(onPc(key('ArrowUp'), field(code, 2))).toEqual({ kind: 'leave', direction: -1 });
    expect(onPc(key('ArrowUp'), field(code, 5))).toBeNull();
    expect(onPc(key('ArrowDown'), field(code, 9))).toEqual({ kind: 'leave', direction: 1 });
    expect(onPc(key('ArrowDown'), field(code, 5))).toBeNull();
  });

  it('leaves Left and Right to the text area, even at the ends of the code', () => {
    expect(onPc(key('ArrowLeft'), field('ab', 0))).toBeNull();
    expect(onPc(key('ArrowRight'), field('ab', 2))).toBeNull();
  });

  it('never leaves while text is selected or while the arrow extends or jumps', () => {
    expect(onPc(key('ArrowUp'), field('ab', 0, 2))).toBeNull();
    expect(onPc(key('ArrowUp', { shiftKey: true }), field('ab', 1))).toBeNull();
    expect(onPc(key('ArrowUp', { altKey: true }), field('ab', 0))).toBeNull();
  });

  it('turns an empty block into a paragraph on Backspace, and deletes text natively otherwise', () => {
    expect(onPc(key('Backspace'), field('', 0))).toEqual({ kind: 'paragraph' });
    expect(onPc(key('Backspace'), field('a', 1))).toBeNull();
  });

  it("sends undo and redo to the editor's history with the platform's modifier", () => {
    expect(onPc(key('z', { ctrlKey: true }), field('a', 1))).toEqual({ kind: 'undo' });
    expect(onPc(key('Z', { ctrlKey: true, shiftKey: true, code: 'KeyZ' }), field('a', 1))).toEqual({ kind: 'redo' });
    expect(onPc(key('y', { ctrlKey: true }), field('a', 1))).toEqual({ kind: 'redo' });
    expect(codeKeyAction(key('z', { metaKey: true }), field('a', 1), true)).toEqual({ kind: 'undo' });
    expect(codeKeyAction(key('z', { ctrlKey: true }), field('a', 1), true)).toBeNull();
  });

  it('leaves Mod+A to the text area, which selects the code', () => {
    expect(onPc(key('a', { ctrlKey: true }), field('ab', 1))).toBeNull();
  });

  it('selects the block on Escape and reaches the block controls on Alt+F10', () => {
    expect(onPc(key('Escape'), field('a', 1))).toEqual({ kind: 'escape' });
    expect(onPc(key('F10', { altKey: true }), field('a', 1))).toEqual({ kind: 'controls' });
  });

  it('leaves every other key to the text area', () => {
    expect(onPc(key('x'), field('a', 1))).toBeNull();
    expect(onPc(key('Home'), field('a', 1))).toBeNull();
  });
});
