import { describe, expect, it } from 'vitest';
import { block, md, readBack, withoutIds } from './export-fixtures';
import { toMarkdown } from './to-markdown';

describe('toMarkdown block forms', () => {
  it('writes every callout tone as its alert and an unknown tone as a note', () => {
    const alert = (tone: string, body = 'x') => toMarkdown([block('CALLOUT', { tone, body })]);
    expect(alert('info')).toBe('> [!NOTE]\n> x\n');
    expect(alert('tip')).toBe('> [!TIP]\n> x\n');
    expect(alert('success')).toBe('> [!IMPORTANT]\n> x\n');
    expect(alert('danger')).toBe('> [!CAUTION]\n> x\n');
    expect(alert('constructor', '')).toBe('> [!NOTE]\n');
  });

  it('keeps code in a fence longer than any backtick run in it', () => {
    const blocks = [block('CODE', { language: 'ts', code: '````\nx\n```' })];
    expect(toMarkdown(blocks)).toBe('`````ts\n````\nx\n```\n`````\n');
    expect(readBack(toMarkdown(blocks))).toEqual(withoutIds(blocks));
  });

  it('uses tildes for a language that holds a backtick and escapes the characters an info string decodes', () => {
    const blocks = [block('CODE', { language: 'a`b', code: '~~~\nx' }), block('CODE', { language: 'a&b\\c', code: '' })];
    expect(toMarkdown(blocks)).toBe('~~~~a`b\n~~~\nx\n~~~~\n\n```a\\&b\\\\c\n```\n');
    expect(readBack(toMarkdown(blocks))).toEqual(withoutIds(blocks));
  });

  it('writes code inside a list item without padding blank lines', () => {
    const blocks = [md('- a'), block('CODE', { language: '', code: 'x\n\ny' }, 1)];
    expect(toMarkdown(blocks)).toBe('- a\n\n  ```\n  x\n\n  y\n  ```\n');
    expect(readBack(toMarkdown(blocks))).toEqual(withoutIds(blocks));
  });

  it('writes empty math and keeps math with a fence-like line as a comment', () => {
    expect(toMarkdown([block('MATH', { latex: '' })])).toBe('$$\n$$\n');
    expect(toMarkdown([block('MATH', { latex: 'a\n$$\nb' })])).toBe(
      '<!-- quoin:MATH {"data":{"latex":"a\\n$$\\nb"}} -->\n',
    );
  });

  it('writes a table without a header row with an empty one, and every column alignment', () => {
    const rows = [['a', 'b'], ['', '2']];
    expect(toMarkdown([block('TABLE', { rows, header: false, align: ['center', 'right'] })])).toBe(
      '|  |  |\n| :-: | --: |\n| a | b |\n|  | 2 |\n',
    );
  });

  it('keeps a table with no cells as a comment', () => {
    expect(toMarkdown([block('TABLE', { rows: [], header: true })])).toBe(
      '<!-- quoin:TABLE {"data":{"rows":[],"header":true,"align":[]}} -->\n',
    );
  });

  it('writes an image from its external url, escaping the alt text and the caption', () => {
    const blocks = [block('IMAGE', { storageKey: 'k', url: 'https://x/y z.png', alt: 'a [b]', caption: 'say "hi"' })];
    expect(toMarkdown(blocks)).toBe('![a \\[b\\]](<https://x/y z.png> "say \\"hi\\"")\n');
    expect(readBack(toMarkdown(blocks))).toEqual([
      { type: 'IMAGE', data: { storageKey: '', alt: 'a [b]', url: 'https://x/y z.png', caption: 'say "hi"' } },
    ]);
  });

  it('writes an image, file, embed or bookmark with no address as a comment', () => {
    expect(toMarkdown([block('IMAGE', { storageKey: '', alt: 'a' })])).toBe(
      '<!-- quoin:IMAGE {"data":{"storageKey":"","alt":"a"}} -->\n',
    );
    expect(toMarkdown([block('FILE', { storageKey: '', filename: 'a' })])).toBe(
      '<!-- quoin:FILE {"data":{"storageKey":"","filename":"a"}} -->\n',
    );
    expect(toMarkdown([block('EMBED', { url: '', provider: 'x' })])).toBe(
      '<!-- quoin:EMBED {"data":{"url":"","provider":"x"}} -->\n',
    );
    expect(toMarkdown([block('BOOKMARK', { url: '' })])).toBe('<!-- quoin:BOOKMARK {"data":{"url":""}} -->\n');
  });

  it('labels a link block with its address when it has no name', () => {
    const out = toMarkdown(
      [block('FILE', { storageKey: 'f', filename: '' }), block('BOOKMARK', { url: 'https://a.b' })],
      { resolveAssetUrl: (key) => `https://cdn/${key}` },
    );
    expect(out).toBe('<https://cdn/f>\n\n<https://a.b>\n');
  });

  it('writes an address with a space as a link with a bracketed destination, not as an autolink', () => {
    expect(toMarkdown([block('EMBED', { url: 'https://a.b/ c', provider: 'x' })])).toBe(
      '[https://a.b/ c](<https://a.b/ c>)\n',
    );
  });

  it('keeps a table of contents that holds data as a comment with its type', () => {
    expect(toMarkdown([block('TOC', { a: 1 }), block('TOC', {}, 1)])).toBe(
      '<!-- quoin:TOC {"data":{"a":1}} -->\n\n<!-- quoin:TOC {"data":{},"indent":1} -->\n',
    );
  });

  it('writes toggles nested in toggles and in list items', () => {
    const blocks = [
      block('TOGGLE', { markdown: 'A', open: true }),
      block('TOGGLE', { markdown: 'B', open: false }, 1),
      md('c', 2),
      md('- d'),
      block('TOGGLE', { markdown: 'T', open: true }, 1),
      md('e', 2),
    ];
    const markdown = toMarkdown(blocks);
    expect(markdown).toBe(
      [
        '<details open>\n<summary>A</summary>\n\n<details>\n<summary>B</summary>\n\nc\n\n</details>\n\n</details>',
        '- d\n\n  <details open>\n  <summary>T</summary>\n\n  e\n\n  </details>',
      ].join('\n\n') + '\n',
    );
    expect(readBack(markdown)).toEqual(withoutIds(blocks));
  });

  it('writes a list inside a toggle', () => {
    const blocks = [block('TOGGLE', { markdown: 'T', open: true }), md('- a', 1), md('- b', 1), md('after')];
    const markdown = toMarkdown(blocks);
    expect(markdown).toBe('<details open>\n<summary>T</summary>\n\n- a\n- b\n\n</details>\n\nafter\n');
    expect(readBack(markdown)).toEqual(withoutIds(blocks));
  });

  it('writes a block deeper than its containers as a comment that keeps the extra depth', () => {
    expect(toMarkdown([md('- a'), block('PLUGIN', { x: 1 }, 3)])).toBe(
      '- a\n\n  <!-- quoin:PLUGIN {"data":{"x":1},"indent":2} -->\n',
    );
  });

  it('skips empty paragraphs and quotes, which markdown cannot hold', () => {
    expect(toMarkdown([md('a'), md(''), md('b'), md('> ')])).toBe('a\n\nb\n');
  });

  it('splits a 0.4 block that holds several nodes before writing it', () => {
    expect(toMarkdown([md('- a\n- b'), md('```\nx\n```')])).toBe('- a\n- b\n\n```\nx\n```\n');
  });

  it('uses the storage key as the address when no resolver is given', () => {
    expect(toMarkdown([block('IMAGE', { storageKey: 'a/b.png', alt: '' })])).toBe('![](a/b.png)\n');
  });
});
