import { describe, expect, it } from 'vitest';
import { atom, text } from '../../model/inline';
import type { Mark } from '../../model/types';
import { parseInline } from './parse-inline';

const b = { type: 'bold' };
const i = { type: 'italic' };
const s = { type: 'strike' };
const c = { type: 'code' };
const u = { type: 'underline' };
const link = (href: string, title?: string): Mark => ({ type: 'link', attrs: title ? { href, title } : { href } });

describe('parseInline', () => {
  it.each([
    ['plain', [text('plain')]],
    ['**b**', [text('b', [b])]],
    ['__b__', [text('b', [b])]],
    ['*i*', [text('i', [i])]],
    ['_i_', [text('i', [i])]],
    ['***bi***', [text('bi', [b, i])]],
    ['~~s~~', [text('s', [s])]],
    ['~s~', [text('s', [s])]],
    ['`c`', [text('c', [c])]],
    ['`` a`b ``', [text('a`b', [c])]],
    ['` `', [text(' ', [c])]],
    ['**a *b* c**', [text('a ', [b]), text('b', [b, i]), text(' c', [b])]],
    ['*a **b** c*', [text('a ', [i]), text('b', [b, i]), text(' c', [i])]],
    ['**unclosed', [text('**unclosed')]],
    ['snake_case_name', [text('snake_case_name')]],
    ['a*b*c', [text('a'), text('b', [i]), text('c')]],
    ['\\*not\\*', [text('*not*')]],
    ['\\a', [text('\\a')]],
    ['a\\\nb', [text('a\nb')]],
    ['a  \nb', [text('a\nb')]],
    ['&amp; &lt; &copy; &#65; &#x42; &bogus;', [text('& < © A B &bogus;')]],
    ['[t](https://x.y "T")', [text('t', [link('https://x.y', 'T')])]],
    ['[t](<a b>)', [text('t', [link('a b')])]],
    ['[**t**](https://x.y)', [text('t', [link('https://x.y'), b])]],
    ['<https://x.y>', [text('https://x.y', [link('https://x.y')])]],
    ['<a@b.co>', [text('a@b.co', [link('mailto:a@b.co')])]],
    ['[x](javascript:alert(1))', [text('x')]],
    ['[no link]', [text('[no link]')]],
    ['![alt](i.png)', [text('![alt](i.png)')]],
    ['<u>u</u>', [text('u', [u])]],
    ['<b>x</b><strong>y</strong>', [text('xy', [b])]],
    ['<em>x</em><i>y</i>', [text('xy', [i])]],
    ['<s>x</s><del>y</del>', [text('xy', [s])]],
    ['<code>x</code>', [text('x', [c])]],
    ['<mark>h</mark>', [text('h', [{ type: 'highlight' }])]],
    ['<mark data-color="yellow">h</mark>', [text('h', [{ type: 'highlight', attrs: { color: 'yellow' } }])]],
    ['<mark data-color="hotpink">h</mark>', [text('h', [{ type: 'highlight' }])]],
    ['<span data-color="red">r</span>', [text('r', [{ type: 'color', attrs: { color: 'red' } }])]],
    ['<span data-bg="blue">x</span>', [text('x', [{ type: 'background', attrs: { color: 'blue' } }])]],
    ['<sub>2</sub><sup>3</sup>', [text('2', [{ type: 'sub' }]), text('3', [{ type: 'sup' }])]],
    ['<span data-comment="c1">x</span>', [text('x', [{ type: 'comment', attrs: { id: 'c1' } }])]],
    ['<span data-mark="kbd" data-attr-size="s">K</span>', [text('K', [{ type: 'kbd', attrs: { size: 's' } }])]],
    ['<span data-color="red">**x**</span>', [text('x', [b, { type: 'color', attrs: { color: 'red' } }])]],
    ['a<br>b', [text('a\nb')]],
    ['<script>x</script>', [text('<script>x</script>')]],
    ['<u>open', [text('<u>open')]],
    ['[@Ada](mention:42)', [atom('mention', { id: '42', label: 'Ada' })]],
    ['[@Team](mention:group:7)', [atom('mention', { id: '7', kind: 'group', label: 'Team' })]],
    ['<span data-atom="emoji" data-attr-name="tada">🎉</span>', [atom('emoji', { name: 'tada' })]],
    ['$x^2$', [atom('math', { latex: 'x^2' })]],
    ['$5 and $6', [text('$5 and $6')]],
    ['$ x$', [text('$ x$')]],
    ['\\$1', [text('$1')]],
    ['`$x$`', [text('$x$', [c])]],
  ])('parses %j', (input, expected) => {
    expect(parseInline(input)).toEqual(expected);
  });

  it('turns a soft line break into a newline by default and a space on request', () => {
    expect(parseInline('a\nb')).toEqual([text('a\nb')]);
    expect(parseInline('a\nb', { softBreak: 'space' })).toEqual([text('a b')]);
  });

  it('resolves reference links from options', () => {
    const refs = new Map([['docs', { href: 'https://d.e', title: 'D' }]]);
    expect(parseInline('[read][docs] and [docs]', { refs })).toEqual([
      text('read', [link('https://d.e', 'D')]),
      text(' and '),
      text('docs', [link('https://d.e', 'D')]),
    ]);
  });
});
