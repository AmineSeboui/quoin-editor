import { describe, expect, it } from 'vitest';
import { block, md, readBack, withoutIds } from './export-fixtures';
import { toMarkdown } from './to-markdown';

const LINE_SEPARATOR = String.fromCharCode(0x2028);

describe('toMarkdown lossless', () => {
  it('keeps text, dividers, toggles and tables of contents as markdown and everything else as a comment', () => {
    const out = toMarkdown(
      [
        md('# T'),
        block('DIVIDER', {}),
        block('TOC', {}),
        block('TOGGLE', { markdown: 'More', open: true }),
        block('CODE', { language: 'ts', code: 'x' }, 1),
        block('CALLOUT', { tone: 'tip', body: 'b' }, 1),
      ],
      { lossless: true },
    );
    expect(out).toBe(
      [
        '# T',
        '---',
        '<!-- quoin:toc -->',
        '<details open>\n<summary>More</summary>',
        '<!-- quoin:CODE {"data":{"language":"ts","code":"x"}} -->',
        '<!-- quoin:CALLOUT {"data":{"tone":"tip","body":"b"}} -->',
        '</details>',
      ].join('\n\n') + '\n',
    );
  });

  it('writes a hyphen pair and a line separator of a payload as JSON escapes the reader restores', () => {
    const blocks = [block('PLUGIN', { 'a--b': '---', c: `x${LINE_SEPARATOR}y`, d: '<!-- -->' })];
    const markdown = toMarkdown(blocks);
    expect(markdown).toBe(
      '<!-- quoin:PLUGIN {"data":{"a-\\u002db":"-\\u002d-","c":"x\\u2028y","d":"<!-\\u002d -\\u002d>"}} -->\n',
    );
    expect(readBack(markdown)).toEqual(withoutIds(blocks));
  });

  it('writes the blocks that have a markdown form as comments only when lossless', () => {
    const blocks = [block('IMAGE', { storageKey: 'k', alt: 'A' })];
    expect(toMarkdown(blocks, { lossless: true })).toBe('<!-- quoin:IMAGE {"data":{"storageKey":"k","alt":"A"}} -->\n');
    expect(toMarkdown(blocks)).toBe('![A](k)\n');
  });

  it('drops a block whose type name could end the comment early', () => {
    expect(toMarkdown([md('a'), block('X --> <b>', { a: 1 }), md('b')])).toBe('a\n\nb\n');
    expect(toMarkdown([md('a'), block('X --> <b>', { a: 1 }), md('b')], { lossless: true })).toBe('a\n\nb\n');
  });

  it('keeps an empty paragraph and an empty quote as comments that read back', () => {
    const blocks = [md(''), md('> '), md('after')];
    const markdown = toMarkdown(blocks, { lossless: true });
    expect(markdown).toBe(
      '<!-- quoin:MARKDOWN {"data":{"markdown":""}} -->\n\n<!-- quoin:MARKDOWN {"data":{"markdown":"> "}} -->\n\nafter\n',
    );
    expect(readBack(markdown)).toEqual(withoutIds(blocks));
  });

  it('keeps a paragraph that follows an empty item as a comment, because markdown reads it as the item text', () => {
    const blocks = [md('- '), md('more', 1)];
    expect(toMarkdown(blocks)).toBe('- \n  more\n');
    expect(readBack(toMarkdown(blocks))).toEqual([{ type: 'MARKDOWN', data: { markdown: '- more' } }]);

    const markdown = toMarkdown(blocks, { lossless: true });
    expect(markdown).toBe('- \n  <!-- quoin:MARKDOWN {"data":{"markdown":"more"}} -->\n');
    expect(readBack(markdown)).toEqual(withoutIds(blocks));
  });
});
