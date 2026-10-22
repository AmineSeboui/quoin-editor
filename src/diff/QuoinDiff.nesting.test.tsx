// @vitest-environment node
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { QuoinDiff } from './QuoinDiff';
import { nestedAfter, nestedBefore } from './test-support/diff-fixture';
import { del, ins, label } from './test-support/diff-markup';

const md = (id: string, markdown: string, indent = 0): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown }, indent });
const toggle = (id: string, markdown: string, indent = 0): QuoinBlock => ({ id, type: 'TOGGLE', data: { markdown, open: false }, indent });
const table = (rows: string[][]): QuoinBlock => ({ id: 'g', type: 'TABLE', data: { rows } });

const diff = (before: QuoinBlock[], after: QuoinBlock[]) => renderToStaticMarkup(<QuoinDiff before={before} after={after} />);

describe('QuoinDiff with nesting', () => {
  it('opens a closed toggle that holds a change, and leaves one that holds none as it was', () => {
    expect(diff([toggle('t', 'Details'), md('c', 'secret old', 1)], [toggle('t', 'Details'), md('c', 'secret new', 1)])).toBe(
      `<div class="quoin-diff"><details open=""><summary>Details</summary><div data-diff="changed">${label('Changed')}` +
        `<p>secret ${del('old')}${ins('new')}</p></div></details></div>`,
    );
    expect(diff([toggle('t', 'Details'), md('c', 'x', 1)], [toggle('t', 'Details'), md('c', 'x', 1), md('n', 'added inside', 1)])).toContain(
      `<details open=""><summary>Details</summary><p>x</p><div data-diff="added">`,
    );
    const quiet = [toggle('t', 'Details'), md('c', 'x', 1)];
    expect(diff(quiet, [...quiet, md('z', 'after')])).toContain('<details><summary>Details</summary><p>x</p></details>');
  });

  it('opens every toggle around a change nested deeper inside it', () => {
    const before = [toggle('o', 'Outer'), toggle('i', 'Inner', 1), md('d', 'deep', 2)];
    const after = [toggle('o', 'Outer'), toggle('i', 'Inner', 1), md('d', 'deeper', 2)];
    expect(diff(before, after).match(/<details open="">/g)).toHaveLength(2);
  });

  it('never lets a removed list item hold the kept items nested after it', () => {
    expect(diff([md('a', '- A'), md('b', '- B'), md('c', '- C', 1)], [md('a', '- A'), md('c', '- C', 1)])).toBe(
      `<div class="quoin-diff"><ul><li>A<ul><li>C</li></ul></li><li data-diff="removed">${label('Removed')} B</li></ul></div>`,
    );
  });

  it('never lets a removed toggle hide or hold the kept blocks nested after it', () => {
    const html = diff([toggle('t', 'T'), md('c', 'kept child', 1)], [md('c', 'kept child', 1)]);
    expect(html).toBe(
      `<div class="quoin-diff"><p data-indent="1">kept child</p><div data-diff="removed">${label('Removed')}` +
        '<details><summary>T</summary></details></div></div>',
    );
  });

  it('keeps the removed blocks nested under a removed item with it', () => {
    const html = diff([md('a', '- A'), md('b', '- B'), md('b1', '- B1', 1), md('c', '- C', 1)], [md('a', '- A'), md('c', '- C', 1)]);
    expect(html).toBe(
      `<div class="quoin-diff"><ul><li>A<ul><li>C</li></ul></li><li data-diff="removed">${label('Removed')} B` +
        `<ul><li data-diff="removed">${label('Removed')} B1</li></ul></li></ul></div>`,
    );
  });

  it('shows the deleted rows and columns of a table as deleted words, as it shows added ones as inserted', () => {
    const removed = diff([table([['a', 'b', 'x'], ['one', 'two', 'y'], ['secret', 'row', 'z']])], [table([['a', 'b'], ['one', 'two']])]);
    expect(removed).toContain(`<th>${del('x')}</th>`);
    expect(removed).toContain(`<td>one</td><td>two</td><td>${del('y')}</td>`);
    expect(removed).toContain(`<tr><td>${del('secret')}</td><td>${del('row')}</td><td>${del('z')}</td></tr>`);
    const added = diff([table([['a', 'b'], ['one', 'two']])], [table([['a', 'b'], ['one', 'two'], ['new', 'row']])]);
    expect(added).toContain(`<tr><td>${ins('new')}</td><td>${ins('row')}</td></tr>`);
  });

  it('keeps the numbers each version gives the items of a numbered list', () => {
    const html = diff([md('a', '1. one'), md('b', '2. two'), md('c', '3. three')], [md('a', '1. one'), md('c', '2. three')]);
    expect(html).toMatch(/<ol><li value="1">one<\/li><li value="2" data-diff="removed">.*two<\/li><li value="2" data-diff="changed">/);
    const added = diff([md('a', '1. one'), md('c', '2. two')], [md('a', '1. one'), md('n', '2. new'), md('c', '3. two')]);
    expect(added).toMatch(/<ol><li value="1">one<\/li><li value="2" data-diff="added">.*<li value="3" data-diff="changed">/);
    expect(diff([md('a', '1. one')], [md('a', '1. one'), md('z', 'z')])).toContain('<ol><li>one</li></ol>');
  });

  it('marks a removed heading in the table of contents, and lists a moved heading once, where it went', () => {
    const toc: QuoinBlock = { id: 'toc', type: 'TOC', data: {} };
    const html = diff([toc, md('g', '## Gone'), md('m', '## Moves'), md('s', '## Stays')], [toc, md('s', '## Stays'), md('m', '## Moves')]);
    const nav = /<nav data-toc="">.*?<\/nav>/.exec(html)?.[0];
    expect(nav).toBe(
      `<nav data-toc=""><ul><li><a href="#h-g">${del('Gone')}</a></li><li><a href="#h-s">Stays</a></li>` +
        '<li><a href="#h-m">Moves</a></li></ul></nav>',
    );
  });

  it('draws a document with every kind of nesting with each change in its own place', () => {
    const html = diff(nestedBefore, nestedAfter);
    expect(html).not.toMatch(/\ue000/);
    expect(html.match(/<details open="">/g)).toHaveLength(2);
    const removedItem = /<li data-diff="removed">.{0,400}?Parent removed.*?<\/li>/.exec(html)?.[0] ?? '';
    expect(removedItem).not.toContain('Grandchild kept');
    expect(html).toContain(`<td>${del('gone')}</td>`);
    expect(html).toContain(`<th>${del('h3')}</th>`);
    expect(html.match(/href="#h-moved-h"/g)).toHaveLength(1);
  });
});
