// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fromHTML } from './from-html';

const markdownOf = (html: string) => {
  let n = 0;
  return fromHTML(html, { newId: () => `d${++n}` }).map(
    (block) => '  '.repeat(block.indent ?? 0) + (block.type === 'MARKDOWN' ? block.data.markdown : `<${block.type}>`),
  );
};

describe('fromHTML task boxes', () => {
  it('reads a line that opens with a ballot box as a task', () => {
    expect(markdownOf('<p>☐ a</p><p><span style="font-family:\'MS Gothic\'">☒</span> <b>b</b></p><ul><li>☑c</li></ul><ol><li>☐ d</li></ol>')).toEqual([
      '- [ ] a',
      '- [x] **b**',
      '- [x] c',
      '- [ ] d',
    ]);
  });

  it('leaves a box inside a line, in a heading or in a quote', () => {
    expect(markdownOf('<p>a ☐ b</p><h2>☐ c</h2><blockquote>☐ d</blockquote>')).toEqual(['a ☐ b', '## ☐ c', '> ☐ d']);
  });

  it('reads the checklists of Google Docs', () => {
    const item = (checked: boolean) =>
      `<li role="checkbox" aria-checked="${checked}"><img src="data:image/png;base64,AA" aria-roledescription="checkbox"><p role="presentation">${checked}</p></li>`;
    expect(markdownOf(`<ul>${item(false)}${item(true)}</ul>`)).toEqual(['- [ ] false', '- [x] true']);
  });
});

describe('fromHTML lists of Word on the web', () => {
  it('nests an item by its level', () => {
    const item = (level: string, text: string) => `<div><ul><li data-aria-level="${level}"><p>${text}</p></li></ul></div>`;
    expect(markdownOf(item('1', 'a') + item('2', 'b') + item('3', 'c') + item('x', 'd') + item('40', 'e'))).toEqual([
      '- a',
      '  - b',
      '    - c',
      '- d',
      '                - e',
    ]);
  });
});
