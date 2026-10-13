import { describe, expect, it } from 'vitest';
import { atom, normalizeInline, text } from '../../engine/model/inline';
import { domMapOf, renderInline } from './render-inline';

const host = () => document.createElement('div');
const b = { type: 'bold' };
const i = { type: 'italic' };
const link = { type: 'link', attrs: { href: 'https://a.b' } };

describe('renderInline', () => {
  it('nests marks in rank order', () => {
    const el = host();
    renderInline(el, normalizeInline([text('a', [i, b, link]), text('b')]), []);
    expect(el.innerHTML).toBe('<a href="https://a.b" data-quoin-link=""><strong><em>a</em></strong></a>b');
  });

  it('renders unsafe links as inert spans', () => {
    const el = host();
    renderInline(el, [text('x', [{ type: 'link', attrs: { href: 'javascript:x' } }])], []);
    expect(el.innerHTML).toBe('<span data-quoin-link="">x</span>');
  });

  it('renders fillers, breaks and atoms', () => {
    const el = host();
    renderInline(el, [], []);
    expect(el.innerHTML).toBe('<br data-quoin-filler="">');
    renderInline(el, [text('a\n')], []);
    expect(el.innerHTML).toBe('a<br data-quoin-break=""><br data-quoin-filler="">');
    renderInline(el, [atom('mention', { id: '1', label: 'Ada' })], []);
    expect(el.innerHTML).toBe('<span contenteditable="false" data-quoin-atom="mention" data-id="1" data-label="Ada">@Ada</span>');
  });

  it('keeps text nodes when only their text changes', () => {
    const el = host();
    renderInline(el, [text('ab', [b]), text('c')], []);
    const node = el.querySelector('strong')!.firstChild;
    renderInline(el, [text('abX', [b]), text('c')], []);
    expect(el.querySelector('strong')!.firstChild).toBe(node);
    expect(node!.textContent).toBe('abX');
  });

  it('removes nodes the browser inserted', () => {
    const el = host();
    renderInline(el, [text('a')], []);
    el.appendChild(document.createElement('div'));
    renderInline(el, [text('a')], []);
    expect(el.innerHTML).toBe('a');
  });

  it('maps offsets both ways across marks, breaks and atoms', () => {
    const el = host();
    const map = renderInline(el, normalizeInline([text('ab', [b]), text('\n'), atom('math', { latex: 'x' }), text('cd')]), []);
    expect(map.length).toBe(6);
    const strongText = el.querySelector('strong')!.firstChild!;
    expect(map.toDom(1)).toEqual({ node: strongText, offset: 1 });
    expect(map.toDom(2, -1)).toEqual({ node: strongText, offset: 2 });
    const tail = el.lastChild!;
    expect(map.toDom(4)).toEqual({ node: tail, offset: 0 });
    expect(map.fromDom(tail, 2)).toBe(6);
    expect(map.fromDom(el, 0)).toBe(0);
    expect(map.fromDom(el, el.childNodes.length)).toBe(6);
    expect(map.fromDom(document.body, 0)).toBeNull();
    expect(domMapOf(el)).toBe(map);
  });

  it('wraps decorations innermost and gives widgets no width', () => {
    const el = host();
    const map = renderInline(el, [text('ab', [b])], [
      { kind: 'inline', block: 'p', region: 'text', from: 0, to: 1, attrs: { class: 'hit' } },
      { kind: 'widget', block: 'p', region: 'text', offset: 2, key: 'k', widget: 'caret', attrs: { 'data-user': 'Bo' } },
    ]);
    expect(el.innerHTML).toBe(
      '<strong><span data-quoin-deco="" class="hit">a</span></strong><strong>b</strong><span contenteditable="false" data-quoin-widget="caret"></span>',
    );
    expect(map.length).toBe(2);
  });
});
