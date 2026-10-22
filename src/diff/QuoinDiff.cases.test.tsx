// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { toHTML } from '../engine/render/to-html';
import { QuoinDiff } from './QuoinDiff';

const md = (id: string, markdown: string, indent = 0): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown }, indent });

const LABEL = /<span data-diff-label="">([^<]*)<span class="quoin-diff-hidden"[^>]*>: <\/span><\/span>/g;

/** The markup with the hidden words left out and each label as `[label]`, to read what a sighted reader sees. */
const visible = (before: QuoinBlock[], after: QuoinBlock[]) =>
  renderToStaticMarkup(<QuoinDiff before={before} after={after} />)
    .replace(LABEL, '[$1]')
    .replace(/<span class="quoin-diff-hidden"[^>]*>[^<]*<\/span>/g, '')
    .replace(/^<div class="quoin-diff">|<\/div>$/g, '');

describe('QuoinDiff on the cases a reviewer probed', () => {
  it('drops an unsafe link it inserts, as toHTML does', () => {
    expect(visible([md('a', 'see here')], [md('a', 'see [here](javascript:alert(1)) now')])).toBe(
      '<div data-diff="changed">[Changed]<p>see here<ins> now</ins></p></div>',
    );
    expect(toHTML([md('a', 'see [here](javascript:alert(1)) now')])).toBe('<p>see here now</p>');
  });

  it('shows a removed caption as deleted words', () => {
    const image = (caption?: string): QuoinBlock => ({ id: 'i', type: 'IMAGE', data: { url: '/c.png', alt: 'Cat', ...(caption ? { caption } : {}) } });
    expect(visible([image('A cat')], [image()])).toContain('<figcaption><del>A cat</del></figcaption>');
  });

  it('names a paragraph turned into a list item as a changed block style', () => {
    expect(visible([md('a', 'x'), md('b', '- y')], [md('a', '- x'), md('b', '- y')])).toBe(
      '<ul><li data-diff="changed">[Changed block style] x</li><li>y</li></ul>',
    );
  });

  it('keeps a removed task in its list, its box checked as it was', () => {
    expect(visible([md('a', '- [ ] a'), md('b', '- [x] b'), md('c', '- [ ] c')], [md('a', '- [ ] a'), md('c', '- [ ] c')])).toContain(
      '<li data-checked="true" data-diff="removed">[Removed] <input type="checkbox" disabled="" aria-label="b" checked=""/> b</li>',
    );
  });

  it('keeps the kept item nested under a changed one in place, unmarked', () => {
    expect(visible([md('a', '- A'), md('c', '- C', 1)], [md('a', '- A2'), md('c', '- C', 1)])).toBe(
      '<ul><li data-diff="changed">[Changed] <del>A</del><ins>A2</ins><ul><li>C</li></ul></li></ul>',
    );
  });

  it('nests a kept item under the item added above it, as the newer version does', () => {
    expect(visible([md('a', 'para'), md('c', '- C', 1)], [md('a', 'para'), md('b', '- B'), md('c', '- C', 1)])).toBe(
      '<p>para</p><ul><li data-diff="added">[Added] B<ul><li>C</li></ul></li></ul>',
    );
  });

  it('marks only the piece of an older block of several paragraphs that changed, or every piece when it went', () => {
    expect(visible([md('m', 'p1\n\np2')], [md('m', 'p1\n\np2 more')])).toBe(
      '<p>p1</p><div data-diff="changed">[Changed]<p>p2<ins> more</ins></p></div>',
    );
    expect(visible([md('m', 'p1\n\np2'), md('z', 'z')], [md('z', 'z')])).toBe(
      '<div data-diff="removed">[Removed]<p>p1</p></div><div data-diff="removed">[Removed]<p>p2</p></div><p>z</p>',
    );
  });

  it('marks the words of a heading, keeping its anchor', () => {
    expect(visible([md('h', '## Old title')], [md('h', '## New title')])).toBe(
      '<div data-diff="changed">[Changed]<h2 id="h-h"><del>Old</del><ins>New</ins> title</h2></div>',
    );
  });

  it('shows a change of marks or links as the words deleted and inserted again', () => {
    expect(visible([md('a', 'The **quick** fox')], [md('a', 'The quick fox')])).toContain('<p>The <del><strong>quick</strong></del><ins>quick</ins> fox</p>');
    expect(visible([md('a', 'see here')], [md('a', 'see [here](https://x.y)')])).toContain(
      '<del>here</del><ins><a href="https://x.y" rel="noopener noreferrer">here</a></ins>',
    );
    expect(visible([md('a', 'see [here](https://a.b)')], [md('a', 'see [here](https://c.d)')])).toContain(
      '<del><a href="https://a.b" rel="noopener noreferrer">here</a></del><ins><a href="https://c.d" rel="noopener noreferrer">here</a></ins>',
    );
  });

  it('speaks where each of two neighbouring replacements starts and ends', () => {
    const html = renderToStaticMarkup(<QuoinDiff before={[md('a', 'one two three four')]} after={[md('a', 'one five six four')]} />);
    const spoken = html.replace(/<[^>]+>/g, '').replace(/^Changed: /, '').replace(/\s+/g, ' ');
    expect(spoken).toBe('one deleted two end deleted inserted five end inserted deleted three end deleted inserted six end inserted four');
  });

  it('splits text that mixes CJK with spaces at its spaces, and shows a block emptied as its words deleted', () => {
    expect(visible([md('a', 'Hello \u4eca\u5929 world')], [md('a', 'Hello \u660e\u5929 world')])).toContain(
      '<p>Hello <del>\u4eca\u5929</del><ins>\u660e\u5929</ins> world</p>',
    );
    expect(visible([md('a', 'Gone text')], [md('a', '')])).toBe('<div data-diff="changed">[Changed]<p><del>Gone text</del></p></div>');
  });
});
