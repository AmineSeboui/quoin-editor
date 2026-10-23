import { describe, expect, it } from 'vitest';
import { toHTML } from './to-html';
import type { QuoinBlock } from '../model/quoin-block';

let n = 0;
const md = (markdown: string, extra: Partial<QuoinBlock> = {}): QuoinBlock => ({ id: `m${++n}`, type: 'MARKDOWN', data: { markdown }, ...extra });
const b = (type: string, data: Record<string, unknown>, extra: Partial<QuoinBlock> = {}): QuoinBlock => ({ id: `b${++n}`, type, data, ...extra });

describe('toHTML', () => {
  it('renders inline marks in rank order and escapes text', () => {
    expect(toHTML([md('[**a** <u>b</u>](https://x.y) <3 `c`')])).toBe(
      '<p><a href="https://x.y" rel="noopener noreferrer"><strong>a</strong> <u>b</u></a> &lt;3 <code>c</code></p>',
    );
  });

  it('renders custom marks as data spans', () => {
    expect(toHTML([md('<span data-mark="x">k</span>')])).toBe('<p><span data-mark="x">k</span></p>');
  });

  it('nests lists by indent and numbers ordered lists', () => {
    expect(toHTML([md('- a'), md('3. b', { indent: 1 }), md('1. c', { indent: 1 }), md('- d')])).toBe(
      '<ul><li>a<ol start="3"><li>b</li><li>c</li></ol></li><li>d</li></ul>',
    );
  });

  it('renders task lists, quotes, headings and alignment', () => {
    expect(toHTML([md('- [x] done'), md('> q1'), md('> q2'), md('## Head', { id: 'h' }), md('mid', { data: { markdown: 'mid', align: 'center' } })])).toBe(
      '<ul data-type="task"><li data-checked="true"><input type="checkbox" disabled checked aria-label="done"> done</li></ul>' +
        '<blockquote><p>q1</p><p>q2</p></blockquote>' +
        '<h2 id="h-h">Head</h2>' +
        '<p style="text-align:center">mid</p>',
    );
  });

  it('renders media and structure blocks', () => {
    const html = toHTML(
      [
        b('IMAGE', { storageKey: 'k', alt: 'A', caption: 'C', width: 2, height: 1 }),
        b('CODE', { language: 'ts', code: 'a < b' }),
        b('TOGGLE', { markdown: 'More', open: false }),
        md('inside', { indent: 1 }),
        b('TABLE', { rows: [['h1', 'h2'], ['1', '2']], header: true, align: [null, 'right'] }),
        b('MATH', { latex: 'x' }),
      ],
      { resolveAssetUrl: (key) => `/a/${key}`, renderMath: (latex) => `<k>${latex}</k>` },
    );
    expect(html).toBe(
      '<figure><img src="/a/k" alt="A" width="2" height="1" loading="lazy" decoding="async"><figcaption>C</figcaption></figure>' +
        '<pre><code class="language-ts">a &lt; b</code></pre>' +
        '<details><summary>More</summary><p>inside</p></details>' +
        '<table><thead><tr><th>h1</th><th style="text-align:right">h2</th></tr></thead><tbody><tr><td>1</td><td style="text-align:right">2</td></tr></tbody></table>' +
        '<div data-math=""><k>x</k></div>',
    );
  });

  it('renders a table of contents linking to headings', () => {
    expect(toHTML([b('TOC', {}), md('# One', { id: 'o' }), md('## Two', { id: 't' })])).toBe(
      '<nav data-toc=""><ul><li><a href="#h-o">One</a><ul><li><a href="#h-t">Two</a></li></ul></li></ul></nav>' +
        '<h1 id="h-o">One</h1><h2 id="h-t">Two</h2>',
    );
  });
});
