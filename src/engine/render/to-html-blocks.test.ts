import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../model/quoin-block';
import { toHTML, type HTMLOptions } from './to-html';

let n = 0;
const md = (markdown: string, extra: Partial<QuoinBlock> = {}): QuoinBlock => ({ id: `m${++n}`, type: 'MARKDOWN', data: { markdown }, ...extra });
const b = (type: string, data: Record<string, unknown>, extra: Partial<QuoinBlock> = {}): QuoinBlock => ({ id: `b${++n}`, type, data, ...extra });
const html = (block: QuoinBlock, options?: HTMLOptions) => toHTML([block], options);

describe('toHTML text blocks', () => {
  it('writes callouts with an optional icon', () => {
    expect(html(b('CALLOUT', { tone: 'warning', icon: '!', body: '**x**' }))).toBe(
      '<aside data-tone="warning"><span data-icon="">!</span><p><strong>x</strong></p></aside>',
    );
    expect(html(b('CALLOUT', { tone: 'info', body: 'hi' }))).toBe('<aside data-tone="info"><p>hi</p></aside>');
  });

  it('writes alignment and block colours on the element, and ignores values outside the palette', () => {
    const data = { markdown: '# x', align: 'right', color: 'red', background: 'blue' };
    expect(html(md('', { id: 'id', data }))).toBe('<h1 id="h-id" style="text-align:right" data-color="red" data-bg="blue">x</h1>');
    expect(html(md('', { id: 'id', data: { markdown: 'x', align: 'sideways', color: 'plaid' } }))).toBe('<p>x</p>');
  });

  it('writes the six heading levels', () => {
    expect(html(md('###### six', { id: 'h6' }))).toBe('<h6 id="h-h6">six</h6>');
  });

  it('opens a new list when the kind of item changes at one indent', () => {
    expect(toHTML([md('- a'), md('1. b'), md('0. c'), md('- [ ] d')])).toBe(
      '<ul><li>a</li></ul><ol><li>b</li><li>c</li></ol><ul data-type="task"><li data-checked="false"><input type="checkbox" disabled> d</li></ul>',
    );
    expect(toHTML([md('0. a'), md('2. b')])).toBe('<ol start="0"><li>a</li><li>b</li></ol>');
  });

  it('nests blocks inside the list item or toggle they follow', () => {
    expect(toHTML([md('- [ ] t'), md('child', { indent: 1 })])).toBe(
      '<ul data-type="task"><li data-checked="false"><input type="checkbox" disabled> t<p>child</p></li></ul>',
    );
    expect(toHTML([b('TOGGLE', { markdown: 'T', open: true }), md('- in', { indent: 1 })])).toBe(
      '<details open><summary>T</summary><ul><li>in</li></ul></details>',
    );
  });

  it('writes the indent a block has beyond its place as data-indent', () => {
    expect(toHTML([md('p', { indent: 2 })])).toBe('<p data-indent="2">p</p>');
    expect(toHTML([md('- a'), md('deep', { indent: 3 })])).toBe('<ul><li>a<p data-indent="2">deep</p></li></ul>');
    expect(toHTML([md('- a', { indent: 2 })])).toBe('<ul><li data-indent="2">a</li></ul>');
    expect(toHTML([md('> a'), md('> b', { indent: 1 })])).toBe(
      '<blockquote><p>a</p></blockquote><blockquote data-indent="1"><p>b</p></blockquote>',
    );
    expect(toHTML([b('DIVIDER', {}, { indent: 1 })])).toBe('<hr data-indent="1">');
  });

  it('gives the same ids to the pieces of a multi-line block and to a colliding block every time', () => {
    const blocks = [md('# A\n\n# B', { id: 'x' }), md('# C', { id: 'x-2' })];
    const expected = '<h1 id="h-x">A</h1><h1 id="h-x-2">B</h1><h1 id="h-split-0">C</h1>';
    expect(toHTML(blocks)).toBe(expected);
    expect(toHTML(blocks)).toBe(expected);
  });

  it('renders a very deep document without recursing past a fixed depth', () => {
    const blocks = Array.from({ length: 20000 }, (_, i) => md(`- item${i}`, { indent: i }));
    const out = toHTML(blocks);
    expect(out).toContain('item19999');
    expect(out.match(/<ul>/g)?.length).toBeLessThan(40);
  });
});

describe('toHTML structure blocks', () => {
  it('writes code with and without a language', () => {
    expect(html(b('CODE', { language: '', code: 'a' }))).toBe('<pre><code>a</code></pre>');
  });

  it('writes dividers and unknown blocks', () => {
    expect(html(b('DIVIDER', {}))).toBe('<hr>');
    expect(html(b('A"B', { x: 1 }))).toBe('<div data-type="A&quot;B"></div>');
  });

  it('writes math as an escaped pre without a host renderer', () => {
    expect(html(b('MATH', { latex: 'x < y' }))).toBe('<pre>x &lt; y</pre>');
  });

  it('writes tables without a header, with only a header, and empty', () => {
    expect(html(b('TABLE', { rows: [['a', '<b>']], header: false, align: [] }))).toBe(
      '<table><tbody><tr><td>a</td><td>&lt;b&gt;</td></tr></tbody></table>',
    );
    expect(html(b('TABLE', { rows: [['**h**']], header: true, align: ['center'] }))).toBe(
      '<table><thead><tr><th style="text-align:center"><strong>h</strong></th></tr></thead></table>',
    );
    expect(html(b('TABLE', { rows: [], header: true, align: [] }))).toBe('<table></table>');
  });

  it('writes a table of contents from the headings, nested by level and escaped', () => {
    expect(toHTML([b('TOC', {}), md('### Deep', { id: 'd' }), md('# Top & more', { id: 't' }), md('## [@Ada](mention:1)', { id: 'a' })])).toBe(
      '<nav data-toc=""><ul><li><a href="#h-d">Deep</a></li><li><a href="#h-t">Top &amp; more</a><ul><li><a href="#h-a">@Ada</a></li></ul></li></ul></nav>' +
        '<h3 id="h-d">Deep</h3><h1 id="h-t">Top &amp; more</h1><h2 id="h-a"><span data-mention="1">@Ada</span></h2>',
    );
    expect(toHTML([b('TOC', {}), md('#', { id: 'e' })])).toBe('<nav data-toc=""></nav><h1 id="h-e"></h1>');
  });
});

describe('toHTML media blocks', () => {
  it('writes an image from its url, with alignment, and nothing without a source', () => {
    expect(html(b('IMAGE', { url: 'https://x.y/a.png', alt: 'say "hi"' }))).toBe(
      '<figure><img src="https://x.y/a.png" alt="say &quot;hi&quot;"></figure>',
    );
    expect(html(b('IMAGE', { url: '/a.png', alt: '', align: 'center' }))).toBe(
      '<figure style="text-align:center"><img src="/a.png" alt=""></figure>',
    );
    expect(html(b('IMAGE', { storageKey: '', alt: 'x' }))).toBe('');
    expect(html(b('IMAGE', { url: 'javascript:alert(1)', alt: 'x' }))).toBe('');
  });

  it('writes a file as a download link that resolves its asset', () => {
    const resolveAssetUrl = (key: string) => `/a/${key}`;
    expect(html(b('FILE', { storageKey: 'k', filename: 'a<b.pdf' }), { resolveAssetUrl })).toBe(
      '<p><a href="/a/k" download>a&lt;b.pdf</a></p>',
    );
    expect(html(b('FILE', { storageKey: 'k', filename: 'f' }))).toBe('<p><a href="k" download>f</a></p>');
    expect(html(b('FILE', { storageKey: '', filename: 'f' }))).toBe('');
  });

  it('drops an unsafe storage key when no host resolver is given', () => {
    for (const storageKey of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'data:text/html,x', 'vbscript:x', 'java\tscript:alert(1)']) {
      expect(html(b('FILE', { storageKey, filename: 'f' }))).toBe('');
      expect(html(b('IMAGE', { storageKey, alt: 'x' }))).toBe('');
    }
    expect(html(b('FILE', { storageKey: 'https://x.y/f.pdf', filename: 'f' }))).toBe(
      '<p><a href="https://x.y/f.pdf" download>f</a></p>',
    );
    expect(html(b('IMAGE', { storageKey: 'a/b.png', alt: 'x' }))).toBe('<figure><img src="a/b.png" alt="x"></figure>');
  });

  it('trusts what a host resolver returns, and writes nothing when it returns nothing', () => {
    const resolveAssetUrl = (key: string) => (key === 'gone' ? '' : `/a/${key}`);
    expect(html(b('IMAGE', { storageKey: 'gone', alt: 'x' }), { resolveAssetUrl })).toBe('');
    expect(html(b('FILE', { storageKey: 'gone', filename: 'f' }), { resolveAssetUrl })).toBe('');
    expect(html(b('IMAGE', { storageKey: 'k', alt: 'x' }), { resolveAssetUrl })).toBe('<figure><img src="/a/k" alt="x"></figure>');
  });

  it('writes an embed as a link or a sandboxed iframe, only for a web address as an iframe', () => {
    const link = '<p><a href="https://youtu.be/x" rel="noopener noreferrer">https://youtu.be/x</a></p>';
    expect(html(b('EMBED', { url: 'https://youtu.be/x' }))).toBe(link);
    expect(html(b('EMBED', { url: 'https://youtu.be/x' }), { embeds: 'iframe' })).toBe(
      '<iframe src="https://youtu.be/x" sandbox="allow-scripts allow-same-origin allow-presentation" loading="lazy"></iframe>',
    );
    expect(html(b('EMBED', { url: 'mailto:a@b.c' }), { embeds: 'iframe' })).toContain('<p><a href="mailto:a@b.c"');
    expect(html(b('EMBED', { url: 'javascript:alert(1)' }), { embeds: 'iframe' })).toBe('');
  });

  it('writes a bookmark as a titled link', () => {
    expect(html(b('BOOKMARK', { url: 'https://x.y', title: 'T & U' }))).toBe(
      '<p><a href="https://x.y" rel="noopener noreferrer">T &amp; U</a></p>',
    );
    expect(html(b('BOOKMARK', { url: 'https://x.y' }))).toBe(
      '<p><a href="https://x.y" rel="noopener noreferrer">https://x.y</a></p>',
    );
    expect(html(b('BOOKMARK', { url: '' }))).toBe('');
  });

  it('escapes every value that reaches an attribute or text', () => {
    const payload = '"><img src=x onerror=alert(1)><script>alert(1)</script>';
    const out = toHTML([
      b('IMAGE', { url: '/a.png', alt: payload, caption: payload }),
      b('CODE', { language: payload, code: payload }),
      b('CALLOUT', { tone: payload, icon: payload, body: payload }),
      b('TABLE', { rows: [[payload]], header: true, align: [payload] }),
      b('FILE', { storageKey: payload, filename: payload }),
      md(`${payload} [x](${payload})`),
    ]);
    const root = document.createElement('div');
    root.innerHTML = out;
    const attributes = [...root.querySelectorAll('*')].flatMap((el) => [...el.attributes].map((attribute) => attribute.name));
    expect(root.querySelector('script')).toBeNull();
    expect(root.querySelectorAll('img')).toHaveLength(1);
    expect(attributes.filter((name) => name.startsWith('on'))).toEqual([]);
  });
});
