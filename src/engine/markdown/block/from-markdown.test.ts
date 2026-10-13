import { describe, expect, it } from 'vitest';
import { fromMarkdown } from './from-markdown';

const parse = (md: string, softBreak: 'newline' | 'space' = 'space') => {
  let n = 0;
  return fromMarkdown(md, { softBreak, newId: () => `b${++n}` }).map(({ id: _id, ...rest }) => rest);
};
const md = (markdown: string, indent?: number) => ({
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent ? { indent } : {}),
});

describe('fromMarkdown', () => {
  it('splits paragraphs and headings into blocks', () => {
    expect(parse('# Title\n\nFirst line\nsame paragraph\n\nSecond')).toEqual([
      md('# Title'),
      md('First line same paragraph'),
      md('Second'),
    ]);
  });

  it('keeps soft breaks as hard breaks on request', () => {
    expect(parse('a\nb', 'newline')).toEqual([md('a\\\nb')]);
  });

  it('reads setext headings', () => {
    expect(parse('Big\n===\n\nSmall\n---')).toEqual([md('# Big'), md('## Small')]);
  });

  it('flattens nested lists into indented items', () => {
    expect(parse('- a\n  - b\n    1. c\n- [x] d\n\n3. e\n4. f')).toEqual([
      md('- a'),
      md('- b', 1),
      md('1. c', 2),
      md('- [x] d'),
      md('3. e'),
      md('4. f'),
    ]);
  });

  it('keeps a list item paragraph as an indented child', () => {
    expect(parse('- item\n\n  more text')).toEqual([md('- item'), md('more text', 1)]);
  });

  it('reads quotes paragraph by paragraph', () => {
    expect(parse('> one\n>\n> two')).toEqual([md('> one'), md('> two')]);
  });

  it('turns GitHub alerts into callouts', () => {
    expect(parse('> [!WARNING]\n> Be **careful**\n> twice')).toEqual([
      { type: 'CALLOUT', data: { tone: 'warning', body: 'Be **careful** twice' } },
    ]);
    expect(parse('> [!NOTE]\n> n')[0].data.tone).toBe('info');
    expect(parse('> [!TIP]\n> n')[0].data.tone).toBe('tip');
    expect(parse('> [!IMPORTANT]\n> n')[0].data.tone).toBe('success');
    expect(parse('> [!CAUTION]\n> n')[0].data.tone).toBe('danger');
  });

  it('reads fenced and indented code', () => {
    expect(parse('```ts\nlet a = 1;\n```\n\n    raw')).toEqual([
      { type: 'CODE', data: { language: 'ts', code: 'let a = 1;' } },
      { type: 'CODE', data: { language: '', code: 'raw' } },
    ]);
  });

  it('reads thematic breaks, math and tables', () => {
    expect(parse('---\n\n$$\nx^2\n$$\n\n| a | b |\n|:--|--:|\n| 1 | 2 \\| 3 |')).toEqual([
      { type: 'DIVIDER', data: {} },
      { type: 'MATH', data: { latex: 'x^2' } },
      { type: 'TABLE', data: { rows: [['a', 'b'], ['1', '2 \\| 3']], header: true, align: ['left', 'right'] } },
    ]);
  });

  it('reads details as a toggle with indented children', () => {
    expect(parse('<details open>\n<summary>More</summary>\n\nInside\n\n</details>\n\nAfter')).toEqual([
      { type: 'TOGGLE', data: { markdown: 'More', open: true } },
      md('Inside', 1),
      md('After'),
    ]);
  });

  it('restores blocks written as quoin comments', () => {
    expect(parse('<!-- quoin:toc -->\n\n<!-- quoin:PLUGIN {"data":{"a":"b-\\u002d>"},"indent":1} -->')).toEqual([
      { type: 'TOC', data: {} },
      { type: 'PLUGIN', data: { a: 'b-->' }, indent: 1 },
    ]);
  });

  it('turns an image alone on a line into an image block', () => {
    expect(parse('![Alt](https://x/i.png "Cap")')).toEqual([
      { type: 'IMAGE', data: { storageKey: '', alt: 'Alt', url: 'https://x/i.png', caption: 'Cap' } },
    ]);
  });

  it('resolves reference links defined anywhere', () => {
    expect(parse('See [docs].\n\n[docs]: https://d.e "D"')).toEqual([md('See [docs](https://d.e "D").')]);
  });

  it('keeps unknown HTML blocks as escaped text', () => {
    expect(parse('<div>hi</div>')).toEqual([md('\\<div>hi\\</div>')]);
  });

  it('returns nothing for blank input', () => {
    expect(parse('\n  \n')).toEqual([]);
  });
});
