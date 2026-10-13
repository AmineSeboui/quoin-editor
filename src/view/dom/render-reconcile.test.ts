import { describe, expect, it } from 'vitest';
import { atom, text } from '../../engine/model/inline';
import { renderInline } from './render-inline';

const host = () => document.createElement('div');
const bold = { type: 'bold' };
const italic = { type: 'italic' };
const link = { type: 'link', attrs: { href: 'https://a.b' } };

describe('reconciliation', () => {
  it('leaves the DOM untouched when nothing changed', () => {
    const el = host();
    const nodes = [text('ab', [bold]), atom('math', { latex: 'x' }), text('c\n')];
    renderInline(el, nodes, []);
    const observer = new MutationObserver(() => undefined);
    observer.observe(el, { childList: true, characterData: true, attributes: true, subtree: true });
    renderInline(el, nodes, []);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect();
  });

  it('keeps the nodes around a change and replaces only the changed ones', () => {
    const el = host();
    renderInline(el, [text('a', [bold]), atom('math', { latex: 'x' }), text('c')], []);
    const [strong, math, tail] = Array.from(el.childNodes);
    renderInline(el, [text('a', [bold]), atom('math', { latex: 'y' }), text('cd')], []);
    expect(el.childNodes[0]).toBe(strong);
    expect(el.childNodes[1]).not.toBe(math);
    expect(el.childNodes[2]).toBe(tail);
    expect(el.innerHTML).toBe(
      '<strong>a</strong><span contenteditable="false" data-quoin-atom="math" data-latex="y">y</span>cd',
    );
  });

  it('keeps the suffix when content is inserted before it', () => {
    const el = host();
    renderInline(el, [text('a', [bold]), text('c')], []);
    const [strong, tail] = Array.from(el.childNodes);
    renderInline(el, [text('z'), text('a', [bold]), text('c')], []);
    expect(el.innerHTML).toBe('z<strong>a</strong>c');
    expect(el.childNodes[1]).toBe(strong);
    expect(el.childNodes[2]).toBe(tail);
  });

  it('replaces an element when its marks change', () => {
    const el = host();
    renderInline(el, [text('a', [bold])], []);
    renderInline(el, [text('a', [italic])], []);
    expect(el.innerHTML).toBe('<em>a</em>');
  });

  it('keeps the text and break nodes of a plain multi-line segment', () => {
    const el = host();
    renderInline(el, [text('a\nb')], []);
    const [first, lineBreak, last] = Array.from(el.childNodes);
    renderInline(el, [text('a\nbc')], []);
    expect(Array.from(el.childNodes)).toEqual([first, lineBreak, last]);
    expect(last.textContent).toBe('bc');
    renderInline(el, [text('a\n\nbc')], []);
    expect(el.innerHTML).toBe('a<br data-quoin-break=""><br data-quoin-break="">bc');
    expect(el.firstChild).toBe(first);
    expect(el.lastChild).toBe(last);
  });

  it('updates the text nodes inside a kept element when lines are added and removed', () => {
    const el = host();
    renderInline(el, [text('a\nb', [bold])], []);
    const strong = el.firstChild;
    const first = strong!.firstChild;
    renderInline(el, [text('ab', [bold])], []);
    expect(el.innerHTML).toBe('<strong>ab</strong>');
    expect(el.firstChild).toBe(strong);
    expect(strong!.firstChild).toBe(first);
    renderInline(el, [text('a\n\nb', [bold])], []);
    expect(el.innerHTML).toBe('<strong>a<br data-quoin-break=""><br data-quoin-break="">b</strong>');
    expect(el.firstChild).toBe(strong);
  });

  it('adds and removes the filler as the last character becomes or stops being a line break', () => {
    const el = host();
    renderInline(el, [text('a')], []);
    renderInline(el, [text('a\n')], []);
    expect(el.lastChild).toMatchObject({ localName: 'br' });
    expect((el.lastChild as Element).hasAttribute('data-quoin-filler')).toBe(true);
    renderInline(el, [text('a')], []);
    expect(el.innerHTML).toBe('a');
    renderInline(el, [], []);
    expect(el.innerHTML).toBe('<br data-quoin-filler="">');
  });

  it('removes stray nodes the browser left inside a kept element and keeps the element', () => {
    const el = host();
    renderInline(el, [text('ab', [bold])], []);
    const strong = el.firstChild as HTMLElement;
    strong.appendChild(document.createElement('i'));
    strong.insertBefore(document.createTextNode('?'), strong.firstChild);
    renderInline(el, [text('ab', [bold])], []);
    expect(el.firstChild).toBe(strong);
    expect(el.innerHTML).toBe('<strong>ab</strong>');
  });

  it('rebuilds an element chain the browser rewrapped or added siblings to', () => {
    const el = host();
    const nodes = [text('a', [link, bold])];
    renderInline(el, nodes, []);
    const anchor = el.firstChild as HTMLElement;
    const strong = anchor.firstChild as HTMLElement;
    const wrapper = document.createElement('span');
    anchor.replaceChild(wrapper, strong);
    wrapper.appendChild(strong);
    renderInline(el, nodes, []);
    expect(el.innerHTML).toBe('<a href="https://a.b" data-quoin-link=""><strong>a</strong></a>');
    expect(el.firstChild).not.toBe(anchor);

    const rebuilt = el.firstChild as HTMLElement;
    rebuilt.appendChild(document.createElement('i'));
    renderInline(el, nodes, []);
    expect(el.innerHTML).toBe('<a href="https://a.b" data-quoin-link=""><strong>a</strong></a>');
    expect(el.firstChild).not.toBe(rebuilt);
  });

  it('rebuilds a marked atom whose wrapper gained a sibling', () => {
    const el = host();
    const nodes = [atom('math', { latex: 'x' }, [bold])];
    renderInline(el, nodes, []);
    const strong = el.firstChild as HTMLElement;
    strong.appendChild(document.createTextNode('?'));
    renderInline(el, nodes, []);
    expect(el.innerHTML).toBe('<strong><span contenteditable="false" data-quoin-atom="math" data-latex="x">x</span></strong>');
    expect(el.firstChild).not.toBe(strong);
  });

  it('replaces a text node the browser swapped for an untracked one', () => {
    const el = host();
    renderInline(el, [text('ab')], []);
    el.firstChild!.replaceWith(document.createTextNode('abX'));
    renderInline(el, [text('ab')], []);
    expect(el.innerHTML).toBe('ab');
  });
});
