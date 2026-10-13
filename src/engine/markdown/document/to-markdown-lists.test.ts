import { describe, expect, it } from 'vitest';
import { md, readBack, withoutIds } from './export-fixtures';
import { toMarkdown } from './to-markdown';
import type { QuoinBlock } from '../../model/quoin-block';

function expectReadsBack(blocks: QuoinBlock[], markdown: string) {
  expect(toMarkdown(blocks)).toBe(markdown);
  expect(readBack(markdown)).toEqual(withoutIds(blocks));
}

describe('toMarkdown lists', () => {
  it('indents children by the content column of the marker', () => {
    expectReadsBack([md('- [ ] a'), md('more', 1)], '- [ ] a\n\n  more\n');
    expectReadsBack([md('9. a'), md('10. b'), md('child', 1)], '9. a\n10. b\n\n    child\n');
  });

  it('keeps the lines of a hard break under the text of the item', () => {
    expectReadsBack([md('- a\\\nb'), md('1. c\\\nd')], '- a\\\n  b\n1. c\\\n   d\n');
  });

  it('keeps hard breaks inside a quote quoted', () => {
    expectReadsBack([md('> a\\\nb')], '> a\\\n> b\n');
  });

  it('numbers an ordered run from its first item and ends it at any block that is not deeper', () => {
    expect(toMarkdown([md('1. a'), md('para'), md('1. b')])).toBe('1. a\n\npara\n\n1. b\n');
    expect(toMarkdown([md('5. a'), md('x', 1), md('9. b')])).toBe('5. a\n\n   x\n\n6. b\n');
    expect(toMarkdown([md('1. a'), md('- b'), md('1. c')])).toBe('1. a\n- b\n1. c\n');
  });

  it('starts a new run under every parent', () => {
    expect(toMarkdown([md('1. a'), md('4. b', 1), md('1. c'), md('4. d', 1), md('1. e', 1)])).toBe(
      '1. a\n\n   4. b\n2. c\n\n   4. d\n   5. e\n',
    );
  });

  it('stops counting at the largest number a marker can hold', () => {
    expect(toMarkdown([md('999999999. a'), md('1. b')])).toBe('999999999. a\n999999999. b\n');
  });

  it('keeps a nested item tight when it can interrupt the text above it', () => {
    expectReadsBack([md('- a'), md('1. b', 1), md('- c', 1)], '- a\n  1. b\n  - c\n');
  });

  it('separates a nested item that could not interrupt a paragraph', () => {
    expectReadsBack([md('- a'), md('5. b', 1)], '- a\n\n  5. b\n');
    expectReadsBack([md('- a'), md('- ', 1)], '- a\n\n  - \n');
  });

  it('keeps what an empty item holds on the next line, because a blank line ends the item', () => {
    expectReadsBack([md('- '), md('5. a', 1), md('# H', 1)], '- \n  5. a\n\n  # H\n');
  });

  it('separates a nested item from text that opens an HTML block', () => {
    expectReadsBack([md('- <br>'), md('- a', 1)], '- <br>\n\n  - a\n');
    expectReadsBack([md('- <u>x</u>'), md('- a', 1)], '- <u>x</u>\n  - a\n');
  });

  it('merges the quotes inside an item with the prefix of the item', () => {
    expectReadsBack([md('- a'), md('> q1', 1), md('> q2', 1)], '- a\n\n  > q1\n  >\n  > q2\n');
  });

  it('writes a block deeper than its containers at the depth of its containers', () => {
    expect(toMarkdown([md('a', 2), md('- b'), md('c', 3)])).toBe('a\n\n- b\n\n  c\n');
  });
});
