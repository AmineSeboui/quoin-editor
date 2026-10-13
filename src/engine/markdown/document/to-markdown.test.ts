import { describe, expect, it } from 'vitest';
import { toMarkdown } from './to-markdown';
import type { QuoinBlock } from '../../model/quoin-block';

let n = 0;
const md = (markdown: string, indent?: number): QuoinBlock => ({
  id: `m${++n}`,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent ? { indent } : {}),
});
const block = (type: string, data: Record<string, unknown>, indent?: number): QuoinBlock => ({
  id: `b${++n}`,
  type,
  data,
  ...(indent ? { indent } : {}),
});

describe('toMarkdown', () => {
  it('separates blocks with a blank line and keeps list items tight', () => {
    expect(toMarkdown([md('# T'), md('para'), md('- a'), md('- b'), md('after')])).toBe('# T\n\npara\n\n- a\n- b\n\nafter\n');
  });

  it('nests list items under the parent content column and renumbers runs', () => {
    expect(toMarkdown([md('1. a'), md('- b', 1), md('7. c'), md('1. d', 1), md('1. e', 1)])).toBe(
      '1. a\n   - b\n2. c\n   1. d\n   2. e\n',
    );
  });

  it('keeps a run starting number from its first item', () => {
    expect(toMarkdown([md('3. a'), md('1. b')])).toBe('3. a\n4. b\n');
  });

  it('writes child paragraphs inside the list item', () => {
    expect(toMarkdown([md('- item'), md('more', 1)])).toBe('- item\n\n  more\n');
  });

  it('merges consecutive quote blocks into one quote', () => {
    expect(toMarkdown([md('> one'), md('> two')])).toBe('> one\n>\n> two\n');
  });

  it('writes callouts as GitHub alerts', () => {
    expect(toMarkdown([block('CALLOUT', { tone: 'warning', body: 'a\\\nb' })])).toBe('> [!WARNING]\n> a\\\n> b\n');
  });

  it('writes code, math, divider, table, image, file, embed, bookmark and toc', () => {
    const out = toMarkdown(
      [
        block('CODE', { language: 'ts', code: 'a\n```\nb' }),
        block('MATH', { latex: 'x' }),
        block('DIVIDER', {}),
        block('TABLE', { rows: [['a', 'b'], ['1', '2']], header: true, align: ['left', null] }),
        block('IMAGE', { storageKey: 'k', alt: 'A', caption: 'C' }),
        block('FILE', { storageKey: 'f', filename: 'a.pdf' }),
        block('EMBED', { url: 'https://y.t/v', provider: 'youtube' }),
        block('BOOKMARK', { url: 'https://a.b', title: 'A' }),
        block('TOC', {}),
      ],
      { resolveAssetUrl: (key) => `https://cdn/${key}` },
    );
    expect(out).toBe(
      [
        '````ts\na\n```\nb\n````',
        '$$\nx\n$$',
        '---',
        '| a | b |\n| :-- | --- |\n| 1 | 2 |',
        '![A](https://cdn/k "C")',
        '[a.pdf](https://cdn/f)',
        '<https://y.t/v>',
        '[A](https://a.b)',
        '<!-- quoin:toc -->',
      ].join('\n\n') + '\n',
    );
  });

  it('writes toggles as details with their children inside', () => {
    expect(toMarkdown([block('TOGGLE', { markdown: 'More', open: false }), md('inside', 1), md('after')])).toBe(
      '<details>\n<summary>More</summary>\n\ninside\n\n</details>\n\nafter\n',
    );
  });

  it('writes unknown blocks, and every non-text block when lossless, as quoin comments', () => {
    expect(toMarkdown([block('PLUGIN', { a: 'b-->' }, 1)])).toBe('<!-- quoin:PLUGIN {"data":{"a":"b-\\u002d>"},"indent":1} -->\n');
    expect(toMarkdown([block('IMAGE', { storageKey: 'k', alt: '' })], { lossless: true })).toBe(
      '<!-- quoin:IMAGE {"data":{"storageKey":"k","alt":""}} -->\n',
    );
  });

  it('strips comment anchors when comments are off', () => {
    expect(toMarkdown([md('a <span data-comment="c1">b</span>')], { comments: false })).toBe('a b\n');
  });

  it('returns an empty string for no blocks', () => {
    expect(toMarkdown([])).toBe('');
  });
});
