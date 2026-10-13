import { describe, expect, it } from 'vitest';
import { markElement } from './mark-elements';

const html = (mark: { type: string; attrs?: Record<string, string> }) => markElement(mark, document).outerHTML;

describe('markElement', () => {
  it('maps the plain marks to their tags', () => {
    expect(html({ type: 'bold' })).toBe('<strong></strong>');
    expect(html({ type: 'italic' })).toBe('<em></em>');
    expect(html({ type: 'underline' })).toBe('<u></u>');
    expect(html({ type: 'strike' })).toBe('<s></s>');
    expect(html({ type: 'sub' })).toBe('<sub></sub>');
    expect(html({ type: 'sup' })).toBe('<sup></sup>');
    expect(html({ type: 'code' })).toBe('<code></code>');
  });

  it('renders safe links as anchors and every other link as an inert span', () => {
    expect(html({ type: 'link', attrs: { href: 'https://a.b/c?d=1' } })).toBe('<a href="https://a.b/c?d=1" data-quoin-link=""></a>');
    expect(html({ type: 'link', attrs: { href: 'mailto:a@b.c' } })).toBe('<a href="mailto:a@b.c" data-quoin-link=""></a>');
    expect(html({ type: 'link', attrs: { href: ' JavaScript:alert(1)' } })).toBe('<span data-quoin-link=""></span>');
    expect(html({ type: 'link', attrs: { href: 'data:text/html,x' } })).toBe('<span data-quoin-link=""></span>');
  });

  it('renders comment, highlight, color and background marks with their data attributes', () => {
    expect(html({ type: 'comment', attrs: { id: 'c1' } })).toBe('<span data-comment="c1"></span>');
    expect(html({ type: 'highlight' })).toBe('<mark></mark>');
    expect(html({ type: 'highlight', attrs: { color: 'yellow' } })).toBe('<mark data-color="yellow"></mark>');
    expect(html({ type: 'color', attrs: { color: 'red' } })).toBe('<span data-color="red"></span>');
    expect(html({ type: 'background', attrs: { color: 'blue' } })).toBe('<span data-bg="blue"></span>');
  });

  it('renders custom marks with their attributes in a fixed order', () => {
    expect(html({ type: 'wiki', attrs: { b: '2', a: '1' } })).toBe('<span data-mark="wiki" data-attr-a="1" data-attr-b="2"></span>');
    expect(html({ type: 'constructor' })).toBe('<span data-mark="constructor"></span>');
  });

  it('skips attribute names the DOM would reject', () => {
    expect(html({ type: 'wiki', attrs: { 'bad name': 'x', 'a"b': 'y', ok: 'z' } })).toBe('<span data-mark="wiki" data-attr-ok="z"></span>');
  });
});
