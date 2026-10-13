import { describe, expect, it } from 'vitest';
import { atom, inlineText, text } from '../../engine/model/inline';
import { readDomText } from './read-dom-text';
import { renderInline } from './render-inline';

const host = (html: string) => {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
};

describe('readDomText', () => {
  it.each([
    ['plain', 'plain'],
    ['<strong>a</strong>b', 'ab'],
    ['a<br data-quoin-break="">b', 'a\nb'],
    ['a<br data-quoin-break=""><br data-quoin-filler="">', 'a\n'],
    ['<br data-quoin-filler="">', ''],
    ['a<br>', 'a'],
    ['a<br>b', 'a\nb'],
    ['x<span contenteditable="false" data-quoin-atom="mention">@Ada</span>y', 'x￼y'],
    ['x<span contenteditable="false" data-quoin-widget="caret">Bo</span>y', 'xy'],
    ['a<div>b</div>', 'a\nb'],
  ])('reads %j', (html, expected) => expect(readDomText(host(html))).toBe(expected));

  it.each([
    ['', ''],
    ['<br>', ''],
    ['a<br><br>', 'a\n'],
    ['a<br data-quoin-break=""><br>', 'a\n'],
    ['<strong>a<br data-quoin-break="">b</strong>', 'a\nb'],
    ['<strong>a<br></strong>', 'a'],
    ['<strong>a<br></strong>b', 'a\nb'],
    ['<em><span data-quoin-atom="math"><span>x</span><br>y</span></em>z', '￼z'],
    ['<span data-quoin-widget="caret"><br>Bo</span>a', 'a'],
  ])('reads inline structure %j', (html, expected) => expect(readDomText(host(html))).toBe(expected));

  it.each([
    ['<div>a</div><div>b</div>', 'a\nb'],
    ['<p>a</p><p>b</p>', 'a\nb'],
    ['a<p>b</p>', 'a\nb'],
    ['a<div><br></div>', 'a\n'],
    ['a<div>b</div><div><br></div>', 'a\nb\n'],
    ['<div><br></div><div>b</div>', '\nb'],
    ['a<div><br></div><div><br></div>', 'a\n\n'],
    ['a<br><div>b</div>', 'a\nb'],
    ['a<div>b<div>c</div></div>', 'a\nb\nc'],
    ['<div><div>a</div></div>', 'a'],
  ])('reads lines the browser started %j', (html, expected) => expect(readDomText(host(html))).toBe(expected));

  it('ignores comments and empty text nodes', () => {
    const el = host('a<!-- note -->b');
    el.appendChild(document.createTextNode(''));
    expect(readDomText(el)).toBe('ab');
  });

  it('reads back what renderInline drew', () => {
    const bold = { type: 'bold' };
    const link = { type: 'link', attrs: { href: 'https://a.b' } };
    const inlines = [
      [],
      [text('plain')],
      [text('a\nb', [bold]), atom('mention', { id: '1', label: 'Ada' }), text(' tail', [link])],
      [text('trailing\n')],
      [text('\n\n')],
      [atom('mention', { id: '1', label: 'Ada' }), atom('math', { latex: 'x\ny' })],
    ];
    for (const inline of inlines) {
      const el = document.createElement('div');
      renderInline(el, inline, [{ kind: 'widget', block: 'b', region: 'content', offset: 0, widget: 'caret', key: 'c', attrs: {} }]);
      expect(readDomText(el)).toBe(inlineText(inline));
    }
  });
});
