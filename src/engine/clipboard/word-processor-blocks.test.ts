// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { fromHTML } from './from-html';

const shapeOf = (html: string) => {
  let n = 0;
  return fromHTML(html, { newId: () => `d${++n}` }).map((block) =>
    block.type === 'MARKDOWN' ? '  '.repeat(block.indent ?? 0) + String(block.data.markdown) : { type: block.type, ...block.data },
  );
};
const sheet = (rules: string, body: string) => `<html><head><style><!--\n${rules}\n--></style></head><body>${body}</body></html>`;

describe('fromHTML quotes written as a Word paragraph style', () => {
  const rules = 'p.MsoQuote {color:#595959; font-style:italic}\np.MsoIntenseQuote {color:#0F4761; font-style:italic}';

  it('reads the Quote and Intense Quote styles as quotes, without the look the style gives them', () => {
    const border = "<div style='mso-element:para-border-div;border:none;border-left:solid #BFBFBF 2.25pt'>";
    const html = `${border}<p class=MsoQuote><span>Quoted words</span></p></div><p class=MsoIntenseQuote>Mind <b>this</b></p>`;
    expect(shapeOf(sheet(rules, html))).toEqual(['> Quoted words', '> Mind **this**']);
  });
});

describe('fromHTML rules written as a bordered empty paragraph', () => {
  it('reads an empty paragraph with a line above or below it as a divider', () => {
    const word =
      "<div style='mso-element:para-border-div;border:none;border-bottom:solid windowtext 1.0pt;padding:0cm 0cm 1.0pt 0cm'>" +
      "<p class=MsoNormal style='border:none;padding:0cm'><span><o:p>&nbsp;</o:p></span></p></div>";
    const libreOffice = '<p style="border-top: none; border-bottom: 1.10pt double #808080; padding: 0cm"><br/></p>';
    expect(shapeOf(`<p>a</p>${word}<p>b</p>${libreOffice}`)).toEqual(['a', { type: 'DIVIDER' }, 'b', { type: 'DIVIDER' }]);
  });

  it('leaves a bordered paragraph with words in it, a side border and a border that is not drawn', () => {
    const html =
      '<div style="border-bottom: solid 1pt"><p>Underlined title</p></div>' +
      '<div style="border-left: solid 2pt"><p>&nbsp;</p></div>' +
      '<p style="border-bottom: none">&nbsp;</p><p style="border-top: 0pt solid">&nbsp;</p><p>end</p>';
    expect(shapeOf(html)).toEqual(['Underlined title', 'end']);
  });
});

describe('fromHTML code written as a monospaced paragraph style', () => {
  const rules = 'p.Code, li.Code, div.Code {font-size:10.0pt; font-family:Consolas; background:#F0F0F0}';
  const code = (lines: string) => ({ type: 'CODE', language: '', code: lines });

  it('reads the paragraphs of a monospaced style as the lines of one code block', () => {
    const html =
      '<p class=MsoNormal>Before</p><p class=Code>const\nanswer = 42;</p><p class=Code>if (a) {<br>' +
      "<span style='mso-spacerun:yes'>&nbsp;&nbsp;</span>b();</p><p class=Code><o:p>&nbsp;</o:p></p><p class=Code>}</p>" +
      '<p class=MsoNormal>After</p><p class=Code>again</p>';
    expect(shapeOf(sheet(rules, html))).toEqual([
      'Before',
      code('const answer = 42;\nif (a) {\n  b();\n\n}'),
      'After',
      code('again'),
    ]);
  });

  it('keeps apart code blocks at different depths', () => {
    const blocks = fromHTML(sheet(rules, '<ul><li>x<p class=Code>b</p></li></ul><p class=Code>c</p>'));
    expect(blocks.map(({ type, indent, data }) => [type, indent ?? 0, data.code ?? data.markdown])).toEqual([
      ['MARKDOWN', 0, '- x'],
      ['CODE', 1, 'b'],
      ['CODE', 0, 'c'],
    ]);
  });

  it('leaves paragraphs whose own style sets a monospaced typeface as text, as a page copied in a browser writes them', () => {
    expect(shapeOf('<p style="font-family:monospace">a</p><p style="font-family:Consolas">b</p>')).toEqual(['a', 'b']);
  });
});
