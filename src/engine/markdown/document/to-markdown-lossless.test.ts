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

  describe('block-level extras on text blocks, toggles and dividers', () => {
    const lossless = (blocks: ReturnType<typeof block>[]) => readBack(toMarkdown(blocks, { lossless: true }));

    it('keeps align, colour and background of a text block as a comment, and drops them when plain', () => {
      const blocks = [block('MARKDOWN', { markdown: '# Title', align: 'center', color: 'red' })];
      expect(toMarkdown(blocks, { lossless: true })).toBe(
        '<!-- quoin:MARKDOWN {"data":{"markdown":"# Title","align":"center","color":"red"}} -->\n',
      );
      expect(lossless(blocks)).toEqual(withoutIds(blocks));
      expect(toMarkdown(blocks)).toBe('# Title\n');
      expect(readBack(toMarkdown(blocks))).toEqual([{ type: 'MARKDOWN', data: { markdown: '# Title' } }]);
    });

    it('keeps any other extra key of a text block', () => {
      const blocks = [block('MARKDOWN', { markdown: 'x', custom: { a: [1, null] }, background: 'blue' })];
      expect(lossless(blocks)).toEqual(withoutIds(blocks));
    });

    it('keeps the extras of a toggle and the children it holds, and drops the extras when plain', () => {
      const blocks = [block('TOGGLE', { markdown: 'T', open: true, color: 'red', note: 1 }), md('child', 1), md('after')];
      expect(lossless(blocks)).toEqual(withoutIds(blocks));
      expect(toMarkdown(blocks)).toBe('<details open>\n<summary>T</summary>\n\nchild\n\n</details>\n\nafter\n');
      expect(readBack(toMarkdown(blocks))[0]).toEqual({ type: 'TOGGLE', data: { markdown: 'T', open: true } });
    });

    it('keeps the extras of a list item and the children it holds', () => {
      const blocks = [md('- a'), block('MARKDOWN', { markdown: '- b', color: 'green' }), md('- c', 1), md('text', 1), md('- d')];
      expect(lossless(blocks)).toEqual(withoutIds(blocks));
      expect(readBack(toMarkdown(blocks)).map((entry) => (entry as { data: unknown }).data)).toEqual([
        { markdown: '- a' },
        { markdown: '- b' },
        { markdown: '- c' },
        { markdown: 'text' },
        { markdown: '- d' },
      ]);
    });

    it('keeps an ordered run numbered when one of its items is a comment', () => {
      const blocks = [md('1. a'), block('MARKDOWN', { markdown: '2. b', align: 'right' }), md('3. c')];
      expect(lossless(blocks)).toEqual(withoutIds(blocks));
    });

    it('keeps the extras of a divider and of a block deep inside what a comment holds', () => {
      const blocks = [
        block('TOGGLE', { markdown: 'T', open: false, color: 'red' }),
        block('TOGGLE', { markdown: 'inner', open: true }, 1),
        block('DIVIDER', { style: 'dots' }, 2),
        block('DIVIDER', {}, 2),
        md('- x', 2),
        md('y', 3),
        block('TOC', {}, 1),
        md('back'),
      ];
      expect(lossless(blocks)).toEqual(withoutIds(blocks));
    });

    it('keeps the indent of a block that no container above it explains', () => {
      const blocks = [md('a'), md('b', 2), block('DIVIDER', {}, 1)];
      expect(lossless(blocks)).toEqual(withoutIds(blocks));
      expect(readBack(toMarkdown(blocks)).map((entry) => (entry as { indent?: number }).indent)).toEqual([
        undefined,
        undefined,
        undefined,
      ]);
    });

    it('keeps a comment inside a native toggle and a native list item at the right depth', () => {
      const blocks = [
        block('TOGGLE', { markdown: 'T', open: true }),
        block('MARKDOWN', { markdown: '- a', color: 'red' }, 1),
        md('child', 2),
        md('- b'),
        block('MARKDOWN', { markdown: 'c', align: 'center' }, 1),
      ];
      expect(lossless(blocks)).toEqual(withoutIds(blocks));
    });
  });
});
