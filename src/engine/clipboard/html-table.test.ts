// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fromHTML } from './from-html';

const rowsOf = (html: string) => {
  let n = 0;
  return fromHTML(html, { newId: () => `d${++n}` }).map((block) => block.data.rows);
};

describe('fromHTML merged table cells', () => {
  it('keeps each cell in its column and leaves the merged slots empty', () => {
    expect(rowsOf('<table><tr><td colspan="2">a</td><td>b</td></tr><tr><td rowspan="2">c</td><td>d</td><td>e</td></tr><tr><td>f</td><td>g</td></tr></table>')).toEqual([
      [
        ['a', '', 'b'],
        ['c', 'd', 'e'],
        ['', 'f', 'g'],
      ],
    ]);
  });

  it('stops a row span at the last row and reads a bad span as one', () => {
    expect(rowsOf('<table><tr><td rowspan="9">a</td><td colspan="0">b</td><td colspan="x">c</td></tr><tr><td>d</td></tr></table>')).toEqual([
      [
        ['a', 'b', 'c'],
        ['', 'd', ''],
      ],
    ]);
  });
});
