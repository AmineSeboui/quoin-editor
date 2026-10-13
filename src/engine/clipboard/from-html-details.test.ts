import { afterEach, describe, expect, it, vi } from 'vitest';
import { fromHTML } from './from-html';

const markdownOf = (html: string) => {
  let n = 0;
  return fromHTML(html, { newId: () => `h${++n}` }).map(
    (block) => '  '.repeat(block.indent ?? 0) + (block.type === 'MARKDOWN' ? block.data.markdown : `<${block.type}>`),
  );
};
const blocksOf = (html: string) => {
  let n = 0;
  return fromHTML(html, { newId: () => `h${++n}` }).map(({ id: _id, ...rest }) => rest);
};

afterEach(() => vi.unstubAllGlobals());

describe('fromHTML text flow', () => {
  it('collapses whitespace and trims block edges', () => {
    expect(markdownOf('<p>  a \n  b   <b> c </b>  d  </p>')).toEqual(['a b **c** d']);
    expect(markdownOf('<p>a</p>\n\n  <p>  b  </p>')).toEqual(['a', 'b']);
  });

  it('drops empty and nbsp-only paragraphs and edge breaks', () => {
    expect(markdownOf('<p></p><p>&nbsp;</p><p><br></p><p><br>a<br></p>')).toEqual(['a']);
  });

  it('keeps the space between marked runs outside the marks', () => {
    expect(markdownOf('<p>a <b>b </b>c <i> d</i> <u>e</u></p>')).toEqual(['a **b** c _d_ <u>e</u>']);
    expect(markdownOf('<p><b>x</b> <b>y</b></p><p><a href="https://u.v"><b>p </b>q</a></p>')).toEqual(['**x y**', '[**p** q](https://u.v)']);
  });

  it('keeps hard breaks without surrounding spaces', () => {
    expect(markdownOf('<p>a <br> b<br><br>c</p>')).toEqual(['a\\\nb\\\n<br>c']);
  });

  it('wraps loose text and inline elements in a paragraph', () => {
    expect(markdownOf('loose <em>text</em><div>block</div>tail')).toEqual(['loose _text_', 'block', 'tail']);
  });

  it('drops head, style, meta, template, noscript and comments', () => {
    const html = '<head><title>t</title><style>p{}</style></head><!-- c --><template><p>x</p></template><noscript>n</noscript><meta charset="utf-8"><p>a</p>';
    expect(markdownOf(html)).toEqual(['a']);
  });

  it('separates paragraphs of a cell-like flatten with a break', () => {
    expect(markdownOf('<ul><li><span>a</span><p>b</p><p>c</p></li></ul>')).toEqual(['- a', '  b', '  c']);
  });
});

describe('fromHTML inline marks', () => {
  it.each([
    ['<u>x</u>', '<u>x</u>'],
    ['<s>x</s>', '~~x~~'],
    ['<del>x</del>', '~~x~~'],
    ['<strike>x</strike>', '~~x~~'],
    ['<code>x</code>', '`x`'],
    ['<kbd>x</kbd>', '`x`'],
    ['<sub>x</sub>', '<sub>x</sub>'],
    ['<sup>x</sup>', '<sup>x</sup>'],
    ['<mark>x</mark>', '<mark>x</mark>'],
    ['<mark data-color="blue">x</mark>', '<mark data-color="blue">x</mark>'],
    ['<strong>x</strong>', '**x**'],
    ['<em>x</em>', '_x_'],
    ['<span style="text-decoration: underline">x</span>', '<u>x</u>'],
    ['<span style="text-decoration-line:line-through">x</span>', '~~x~~'],
    ['<span style="vertical-align:super">x</span>', '<sup>x</sup>'],
    ['<span style="vertical-align: sub">x</span>', '<sub>x</sub>'],
    ['<span style="font-weight:bold">x</span>', '**x**'],
    ['<span style="font-weight:600">x</span>', '**x**'],
    ['<span style="font-weight:500">x</span>', 'x'],
    ['<span style="font-style:oblique">x</span>', '_x_'],
    ['<b style="font-weight:normal">x</b>', 'x'],
    ['<strong><span style="font-weight:400">x</span></strong>', 'x'],
    ['<i style="font-style:normal">x</i>', 'x'],
    ['<span style="color:#9b9a97">x</span>', '<span data-color="gray">x</span>'],
    ['<span style="color:#aaa">x</span>', '<span data-color="gray">x</span>'],
    ['<span style="color:rgb(0 0 255 / 0.5)">x</span>', '<span data-color="blue">x</span>'],
    ['<span style="background-color:#fbf3db80">x</span>', '<span data-bg="yellow">x</span>'],
    ['<span style="background-color:#fff">x</span>', 'x'],
    ['<span style="color:not-a-colour">x</span>', 'x'],
    ['<span style="background-color:#fdebec !important">x</span>', '<span data-bg="red">x</span>'],
    ['<span style="color:#000;background-color:transparent">x</span>', 'x'],
  ])('maps %s', (html, expected) => expect(markdownOf(`<p>${html}</p>`)).toEqual([expected]));

  it('writes link titles and ignores unsafe or missing hrefs', () => {
    expect(markdownOf('<p><a href="https://x.y" title="T">a</a> <a href="mailto:a@b.c">m</a> <a name="n">n</a> <a href="">e</a> <a href="data:text/html,x">d</a></p>')).toEqual([
      '[a](https://x.y "T") [m](mailto:a@b.c) n e d',
    ]);
  });

  it('keeps link styling out of links', () => {
    expect(markdownOf('<p><a href="https://x.y"><span style="color:#1155cc;text-decoration:underline">a</span></a></p>')).toEqual([
      '[a](https://x.y)',
    ]);
  });

  it('applies the marks of wrappers around blocks', () => {
    expect(markdownOf('<b><p>x</p></b>')).toEqual(['**x**']);
    expect(markdownOf('<a href="https://x.y"><div>x</div></a>')).toEqual(['[x](https://x.y)']);
    expect(markdownOf('<div style="font-style:italic"><p>x</p><ul><li>y</li></ul></div>')).toEqual(['_x_', '- _y_']);
  });

  it('keeps a heading from becoming bold text', () => {
    expect(markdownOf('<h3><span style="font-weight:700">T</span> <i>u</i></h3><h4><b>x</b></h4>')).toEqual(['### T _u_', '#### x']);
  });
});

describe('fromHTML structures', () => {
  it('reads blockquotes, nested and multi paragraph', () => {
    expect(markdownOf('<blockquote><p>a</p><p>b</p><blockquote><p>c</p></blockquote></blockquote>')).toEqual(['> a', '> b', '  > c']);
    expect(markdownOf('<blockquote>plain<br>two</blockquote>')).toEqual(['> plain\\\ntwo']);
  });

  it('reads code blocks', () => {
    expect(blocksOf('<pre><code class="lang-py">a\n  b\n</code></pre><pre>x<br>y</pre><pre><code class="hljs">z</code></pre>')).toEqual([
      { type: 'CODE', data: { language: 'py', code: 'a\n  b' } },
      { type: 'CODE', data: { language: '', code: 'x\ny' } },
      { type: 'CODE', data: { language: '', code: 'z' } },
    ]);
  });

  it('numbers ordered items from the start attribute', () => {
    expect(markdownOf('<ol start="3"><li>a</li><li>b</li></ol><ol start="x"><li>c</li></ol><ol start="-2"><li>d</li></ol>')).toEqual([
      '3. a',
      '4. b',
      '1. c',
      '1. d',
    ]);
  });

  it('reads Google Docs style nested lists and loose items', () => {
    const html = '<ul><li><p>a</p></li><ul><li><p>b</p></li><ul><li><p>c</p></li></ul></ul></ul>';
    expect(markdownOf(html)).toEqual(['- a', '  - b', '    - c']);
    expect(markdownOf('<ul><li><p>a</p><p>more</p><pre>code</pre></li></ul>')).toEqual(['- a', '  more', '  <CODE>']);
    expect(markdownOf('<ul><li></li><li><ul><li>x</li></ul></li></ul>')).toEqual(['- ', '- ', '  - x']);
    expect(markdownOf('<ul>stray<li>a</li></ul>')).toEqual(['stray', '- a']);
    expect(markdownOf('<li>alone</li>')).toEqual(['- alone']);
  });

  it('reads task boxes in the several forms', () => {
    expect(markdownOf('<ul><li><input type="checkbox" disabled> a</li><li><p><input type="checkbox" checked> b</p></li><li><div class="checkbox checkbox-on"></div>c</li></ul>')).toEqual([
      '- [ ] a',
      '- [x] b',
      '- [x] c',
    ]);
  });

  it('reads tables without a header section and ragged rows', () => {
    expect(blocksOf('<table><tr><th>h</th><th>i</th></tr><tr><td>1</td></tr></table>')).toEqual([
      { type: 'TABLE', data: { rows: [['h', 'i'], ['1', '']], header: true, align: [null, null] } },
    ]);
    expect(blocksOf('<table><tr><td>1</td></tr><tr><td><p>a</p><p>b <b>c</b></p></td></tr></table>')).toEqual([
      { type: 'TABLE', data: { rows: [['1'], ['a<br>b **c**']], header: false, align: [null] } },
    ]);
    expect(blocksOf('<table></table><table><tr></tr></table>')).toEqual([]);
  });

  it('reads images, figures and captions, dropping unsafe sources', () => {
    expect(blocksOf('<img src="data:image/png;base64,AA"><img alt="x"><figure><img src="/a.png" alt="A"><figcaption>cap <i>x</i></figcaption></figure><figure><p>in</p></figure>')).toEqual([
      { type: 'IMAGE', data: { storageKey: '', alt: 'A', caption: 'cap _x_', url: '/a.png' } },
      { type: 'MARKDOWN', data: { markdown: 'in' } },
    ]);
    expect(blocksOf('<p>a<img src="https://i/p.png">b</p>').map((block) => block.type)).toEqual(['MARKDOWN', 'IMAGE', 'MARKDOWN']);
  });

  it('reads closed toggles and toggles without a summary', () => {
    expect(blocksOf('<details><summary>S <b>t</b></summary><ul><li>x</li></ul></details><details><p>y</p></details>')).toEqual([
      { type: 'TOGGLE', data: { markdown: 'S **t**', open: false } },
      { type: 'MARKDOWN', data: { markdown: '- x' }, indent: 1 },
      { type: 'TOGGLE', data: { markdown: '', open: false } },
      { type: 'MARKDOWN', data: { markdown: 'y' }, indent: 1 },
    ]);
  });

  it('reads Word list paragraphs with markers and levels', () => {
    const item = (style: string, marker: string, text: string) =>
      `<p class=MsoListParagraph style='${style}'><span style='mso-list:Ignore'>${marker}<span>&nbsp;</span></span>${text}<o:p></o:p></p>`;
    const html = [
      item('mso-list:l1 level1 lfo2', '1.', 'one'),
      item('mso-list:l1 level2 lfo2', 'a)', 'sub'),
      item('mso-list:l0 level1 lfo1', 'o', 'dot'),
      "<p class=MsoListParagraphCxSpMiddle>plain list</p>",
    ].join('');
    expect(markdownOf(html)).toEqual(['1. one', '  1. sub', '- dot', '- plain list']);
  });

  it('does not overflow the stack on very deep documents', () => {
    const parser = (tag: string, depth: number) => ({
      parseFromString: () => {
        const doc = new DOMParser().parseFromString('', 'text/html');
        let current: Node = doc.createTextNode('deep');
        for (let level = 0; level < depth; level++) {
          const wrapper = doc.createElement(tag);
          wrapper.appendChild(current);
          current = wrapper;
        }
        doc.body.replaceChildren(current);
        return doc;
      },
    });
    for (const tag of ['div', 'span', 'ul', 'li', 'blockquote', 'details', 'pre', 'b']) {
      const blocks = fromHTML('', { parser: parser(tag, 1500) });
      expect(JSON.stringify(blocks)).toContain('deep');
      expect(Math.max(...blocks.map((block) => block.indent ?? 0))).toBeLessThan(110);
    }
  });
});

describe('fromHTML environment', () => {
  it('uses a given parser and default ids', () => {
    const parseFromString = vi.fn(() => new DOMParser().parseFromString('<p>a</p>', 'text/html'));
    const [block] = fromHTML('ignored', { parser: { parseFromString } });
    expect(parseFromString).toHaveBeenCalledWith('ignored', 'text/html');
    expect(block.id).toMatch(/\S/);
  });

  it('needs a DOMParser', () => {
    vi.stubGlobal('DOMParser', undefined);
    expect(() => fromHTML('<p>a</p>')).toThrow('fromHTML needs a DOMParser');
  });
});
