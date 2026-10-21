import { indentLines, insertInCode, newlineKeepingIndent, outdentLines, type CodeField } from './code-edits';

const field = (value: string, start: number, end = start): CodeField => ({ value, start, end });

describe('indentLines', () => {
  it('indents every line the selection touches by two spaces and keeps the selection on the same text', () => {
    expect(indentLines(field('a\nbb\nc', 1, 4))).toEqual(field('  a\n  bb\nc', 3, 8));
  });

  it('leaves out a line the selection only reaches the start of', () => {
    expect(indentLines(field('a\nb\nc', 0, 4))).toEqual(field('  a\n  b\nc', 0, 8));
  });

  it('keeps a selection of whole lines starting at the start of its first line', () => {
    expect(indentLines(field('a\nb', 0, 3))).toEqual(field('  a\n  b', 0, 7));
  });
});

describe('outdentLines', () => {
  it('removes up to two spaces or one tab from the start of every line the selection touches', () => {
    expect(outdentLines(field('    a\n b\n\tc\nd', 0, 12))).toEqual(field('  a\nb\nc\nd', 0, 8));
  });

  it('moves a caret inside the removed indentation to the start of its line', () => {
    expect(outdentLines(field('x\n   y', 3))).toEqual(field('x\n y', 2));
  });

  it('moves a caret after the indentation back by what was removed', () => {
    expect(outdentLines(field('  let a', 5))).toEqual(field('let a', 3));
  });

  it('changes nothing on lines with no indentation', () => {
    expect(outdentLines(field('a\nb', 0, 3))).toBeNull();
  });
});

describe('insertInCode', () => {
  it('replaces the selection with the text and puts the caret after it', () => {
    expect(insertInCode(field('abcd', 1, 3), '  ')).toEqual(field('a  d', 3));
  });
});

describe('newlineKeepingIndent', () => {
  it('starts the new line with the indentation of the line the caret is on', () => {
    expect(newlineKeepingIndent(field('if (a) {\n    b();', 17))).toEqual(field('if (a) {\n    b();\n    ', 22));
  });

  it('never indents the new line past the column the caret was at', () => {
    expect(newlineKeepingIndent(field('    b', 2))).toEqual(field('  \n    b', 5));
  });

  it('keeps tabs as they are', () => {
    expect(newlineKeepingIndent(field('\tx', 2))).toEqual(field('\tx\n\t', 4));
  });
});
