// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fromHTML } from './from-html';

const markdownOf = (html: string) => {
  let n = 0;
  return fromHTML(html, { newId: () => `d${++n}` }).map(
    (block) => '  '.repeat(block.indent ?? 0) + (block.type === 'MARKDOWN' ? block.data.markdown : `<${block.type}>`),
  );
};
const sheet = (rules: string, body: string) => `<html><head><style><!--\n${rules}\n--></style></head><body>${body}</body></html>`;

describe('fromHTML class rules', () => {
  it('reads the classes a style sheet styles, behind the style of the element', () => {
    const rules = 'span.u {text-decoration: underline}\n.red, p.ignored:hover {color: #d44c47}\nspan.b {font-weight: bold}';
    expect(markdownOf(sheet(rules, '<p><span class="u">a</span> <span class="red">b</span> <span class="b" style="font-weight:400">c</span></p>'))).toEqual([
      '<u>a</u> <span data-color="red">b</span> c',
    ]);
  });

  it('leaves out rules for a bare element, at-rules and comments', () => {
    const rules = '/* p.x {font-weight:bold} */ p {color: #d44c47} @font-face {font-family: X} span.MsoX {font-style: italic}';
    expect(markdownOf(sheet(rules, '<p class="x">a <span class="MsoX">b</span></p>'))).toEqual(['a _b_']);
  });
});

describe('fromHTML headings written as styled runs', () => {
  const body = (size: string) => `<p style="font-size:${size}">Body text that most of the paste is written in.</p>`;

  it('reads a level from how much larger a paragraph is than the body text', () => {
    const html = ['24pt', '18pt', '14pt', '13pt'].map((size) => `<p><b style="font-size:${size}">${size}</b></p>`).join('') + body('12pt');
    expect(markdownOf(html)).toEqual(['# 24pt', '## 18pt', '### 14pt', '**13pt**', 'Body text that most of the paste is written in.']);
  });

  it('takes a larger line short of a title for a heading only when it is bold', () => {
    const html = `<p style="font-size:30pt">Title</p><p style="font-size:21px">A lede</p><p style="font-size:21px"><b>Bold</b> lede</p>${body('18px')}`;
    expect(markdownOf(html)).toEqual(['# Title', 'A lede', '**Bold** lede', 'Body text that most of the paste is written in.']);
  });

  it('reads points, pixels and the font shorthand, and a size inherited from a wrapper', () => {
    const html = `<div style="font: italic bold 32px/40px Georgia"><div>Big</div></div>${body('16px')}<p style="font-size:2em">Relative</p>`;
    expect(markdownOf(html)).toEqual(['# Big', 'Body text that most of the paste is written in.', 'Relative']);
  });

  it('takes text with no size as the browser default', () => {
    expect(markdownOf('<p><font style="font-size: 14pt"><b>Steps</b></font></p><p>Plain body text with no size given.</p>')).toEqual([
      '### Steps',
      'Plain body text with no size given.',
    ]);
  });

  it('leaves a paste written in one size, a paragraph of mixed sizes and quoted text as they are', () => {
    expect(markdownOf('<p style="font-size:30pt">Alone</p>')).toEqual(['Alone']);
    expect(markdownOf(`<p><span style="font-size:30pt">Big</span> small</p>${body('11pt')}`)).toEqual([
      'Big small',
      'Body text that most of the paste is written in.',
    ]);
    expect(markdownOf(`<blockquote><p style="font-size:30pt">Quoted</p></blockquote>${body('11pt')}`)[0]).toBe('> Quoted');
  });

  it('reads the heading role and its level', () => {
    expect(markdownOf('<p role="heading" aria-level="3">a</p><div role="heading">b</div><p role="heading" aria-level="9">c</p><p role="heading" aria-level="x">d</p>')).toEqual([
      '### a',
      '## b',
      '###### c',
      '## d',
    ]);
  });

  it('keeps a Word list paragraph a list item whatever its size', () => {
    const item = "<p class=MsoListParagraph style='mso-list:l0 level1 lfo1;font-size:30pt'><span style='mso-list:Ignore'>1.</span>One</p>";
    expect(markdownOf(item + body('11pt'))).toEqual(['1. One', 'Body text that most of the paste is written in.']);
  });
});
