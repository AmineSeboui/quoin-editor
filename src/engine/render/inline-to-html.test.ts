import { describe, expect, it, vi } from 'vitest';
import { atom, text } from '../model/inline';
import type { Mark } from '../model/types';
import { escapeAttr, escapeHtml } from './escape-html';
import { inlineToHTML } from './inline-to-html';

const bold: Mark = { type: 'bold' };
const italic: Mark = { type: 'italic' };

describe('escaping', () => {
  it('escapes markup characters in text and quotes in attributes', () => {
    expect(escapeHtml('a < b & c > "d"')).toBe('a &lt; b &amp; c &gt; "d"');
    expect(escapeAttr('a "b" & <c>')).toBe('a &quot;b&quot; &amp; &lt;c&gt;');
  });
});

describe('inlineToHTML', () => {
  it('escapes text and turns line breaks into br', () => {
    expect(inlineToHTML([text('a<b & "c"\nd')])).toBe('a&lt;b &amp; "c"<br>d');
    expect(inlineToHTML([])).toBe('');
  });

  it('nests every core mark in rank order', () => {
    const marks: Mark[] = [
      { type: 'code' },
      { type: 'background', attrs: { color: 'blue' } },
      { type: 'color', attrs: { color: 'red' } },
      { type: 'highlight', attrs: { color: 'yellow' } },
      { type: 'sup' },
      { type: 'sub' },
      { type: 'strike' },
      { type: 'underline' },
      italic,
      bold,
      { type: 'comment', attrs: { id: 'c1' } },
      { type: 'link', attrs: { href: '/p', title: 'T "q"' } },
    ];
    expect(inlineToHTML([text('x', marks)])).toBe(
      '<a href="/p" title="T &quot;q&quot;" rel="noopener noreferrer"><span data-comment="c1"><strong><em><u><s><sub><sup>' +
        '<mark data-color="yellow"><span data-color="red"><span data-bg="blue"><code>x</code></span></span></mark>' +
        '</sup></sub></s></u></em></strong></span></a>',
    );
  });

  it('writes a highlight without a colour as a bare mark', () => {
    expect(inlineToHTML([text('x', [{ type: 'highlight' }])])).toBe('<mark>x</mark>');
  });

  it('shares a mark across neighbouring nodes and closes it once', () => {
    expect(inlineToHTML([text('a', [bold]), text('b', [bold, italic]), text('c')])).toBe('<strong>a<em>b</em></strong>c');
  });

  it('drops a link with an unsafe href and keeps its text and other marks', () => {
    const link: Mark = { type: 'link', attrs: { href: 'javascript:alert(1)' } };
    expect(inlineToHTML([text('x', [link, bold]), text('y', [link])])).toBe('<strong>x</strong>y');
  });

  it('writes custom marks as data spans with sorted attributes and never an unsafe attribute name', () => {
    const custom: Mark = { type: 'x"y', attrs: { b: '2', a: '1', 'c" onclick="z': '3' } };
    expect(inlineToHTML([text('k', [custom])])).toBe('<span data-mark="x&quot;y" data-attr-a="1" data-attr-b="2">k</span>');
  });

  it('writes mentions with an optional kind', () => {
    expect(inlineToHTML([atom('mention', { id: '1', label: 'A<da', kind: 'user' })])).toBe(
      '<span data-mention="1" data-kind="user">@A&lt;da</span>',
    );
    expect(inlineToHTML([atom('mention', { id: '1', label: 'Ada' }, [bold])])).toBe(
      '<strong><span data-mention="1">@Ada</span></strong>',
    );
  });

  it('writes math as escaped latex, or through the host renderer for inline display', () => {
    expect(inlineToHTML([atom('math', { latex: 'x < y' })])).toBe('<span data-math="">x &lt; y</span>');
    const renderMath = vi.fn((latex: string) => `<k>${latex}</k>`);
    expect(inlineToHTML([atom('math', { latex: 'x' })], { renderMath })).toBe('<span data-math=""><k>x</k></span>');
    expect(renderMath).toHaveBeenCalledWith('x', { displayMode: false });
  });

  it('writes any other atom as an empty data span', () => {
    expect(inlineToHTML([atom('emoji', { name: 'tada' })])).toBe('<span data-atom="emoji" data-attr-name="tada"></span>');
  });
});
