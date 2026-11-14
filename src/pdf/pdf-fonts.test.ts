// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { exportPdf } from './test-support/export-pdf';
import { type PdfName, type PdfDict } from './test-support/parse-pdf';
import { tinyFont } from './test-support/tiny-font';

const md = (id: string, markdown: string): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown } });
const name = (value: unknown) => (value as PdfName).name;

const cjk = tinyFont({
  name: 'TinySans-Regular',
  unitsPerEm: 2048,
  glyphs: [
    ['A', 1366],
    ['\u4E2D', 2048],
    ['\u6587', 2048],
    ['\u65E5', 1900],
  ],
});

describe('toPdf with the standard fonts', () => {
  it('declares each face it draws with as a standard Type 1 font in WinAnsiEncoding, embedding nothing', async () => {
    const pdf = await exportPdf([md('a', 'plain **bold** `code`')]);
    const fonts = pdf.fonts();
    expect([...fonts.keys()].sort()).toEqual(['Courier', 'Helvetica', 'Helvetica-Bold']);
    for (const font of fonts.values()) {
      expect([name(font.Subtype), name(font.Encoding), font.FontDescriptor]).toEqual(['Type1', 'WinAnsiEncoding', undefined]);
    }
  });

  it('draws each character no font has as an empty box in the text colour, and reports them once for each block', async () => {
    const pdf = await exportPdf([
      md('a', 'Hi \u4E2D\u6587 and \u4E2D again'),
      md('b', '\u26A0\uFE0F \u{1F468}\u200D\u{1F469}'),
      md('c', 'all Latin'),
    ]);
    expect(pdf.text.split('\n')).toEqual(['Hi  and  again', ' ', 'all Latin']);
    const boxes = pdf.pages[0].strokes;
    expect(boxes).toHaveLength(5);
    expect(boxes.every(({ color }) => color.join() === '0.039,0.039,0.039')).toBe(true);
    expect(pdf.problems).toEqual([
      { type: 'glyphs', blockId: 'a', characters: '\u4E2D\u6587' },
      { type: 'glyphs', blockId: 'b', characters: '\u26A0\u{1F468}\u{1F469}' },
    ]);
  });

  it('reports the characters of a table cell and an image caption against their block', async () => {
    const pdf = await exportPdf([
      { id: 't', type: 'TABLE', data: { rows: [['\u0410'], ['\u0411']], header: true, align: [] } },
      { id: 'i', type: 'IMAGE', data: { alt: '\u05D0' } },
    ]);
    expect(pdf.problems).toEqual([
      { type: 'glyphs', blockId: 't', characters: '\u0410\u0411' },
      { type: 'glyphs', blockId: 'i', characters: '\u05D0' },
    ]);
  });
});

describe('toPdf with fonts the host supplies', () => {
  it('embeds a TrueType font whole, as a Type 0 font of glyph ids through Identity-H', async () => {
    const pdf = await exportPdf([md('a', '\u4E2D\u6587')], { fonts: { regular: cjk } });
    const font = pdf.fonts().get('TinySans-Regular')!;
    expect([name(font.Subtype), name(font.Encoding)]).toEqual(['Type0', 'Identity-H']);
    const [descendant] = (font.DescendantFonts as unknown[]).map((ref) => pdf.file.dict(ref as never));
    expect([name(descendant.Subtype), name(descendant.CIDToGIDMap), name(descendant.BaseFont)]).toEqual(['CIDFontType2', 'Identity', 'TinySans-Regular']);
    const system = pdf.file.dict(descendant.CIDSystemInfo);
    expect(new TextDecoder().decode((system.Ordering as { bytes: Uint8Array }).bytes)).toBe('Identity');
    const descriptor = pdf.file.dict(descendant.FontDescriptor);
    expect(descriptor).toMatchObject({ Ascent: 381, Descent: -107, CapHeight: 332, Flags: 4 });
    const program = pdf.file.stream(descriptor.FontFile2);
    expect(program).toEqual(cjk);
    expect(pdf.file.dict(descriptor.FontFile2).Length1).toBe(cjk.length);
  });

  it('gives each glyph it draws its width in thousandths of an em', async () => {
    const pdf = await exportPdf([md('a', '\u65E5\u4E2D\u6587A')], { fonts: { regular: cjk } });
    const descendant = pdf.file.dict((pdf.fonts().get('TinySans-Regular')!.DescendantFonts as unknown[])[0] as never);
    expect(descendant.W).toEqual([1, [667, 1000, 1000, 928]]);
  });

  it('maps every glyph back to its character, so a reader can copy and search the text', async () => {
    const pdf = await exportPdf([md('a', 'A\u4E2D\u6587\u65E5')], { fonts: { regular: cjk } });
    expect(pdf.text).toBe('A\u4E2D\u6587\u65E5');
    expect(pdf.problems).toEqual([]);
  });

  it('breaks Chinese text between characters to fit the line', async () => {
    const pdf = await exportPdf([md('a', '\u4E2D\u6587'.repeat(60))], { fonts: { regular: cjk } });
    const lines = pdf.text.split('\n');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join('')).toBe('\u4E2D\u6587'.repeat(60));
  });

  it('falls back to the standard fonts for what the host font lacks', async () => {
    const pdf = await exportPdf([md('a', 'Ab\u4E2D')], { fonts: { regular: cjk } });
    expect(pdf.pages[0].shows.map(({ text, font }) => [text, font])).toEqual([
      ['A', 'TinySans-Regular'],
      ['b', 'Helvetica'],
      ['\u4E2D', 'TinySans-Regular'],
    ]);
  });

  it('fakes bold with an outline and italic with a slant when the host gave only a regular face', async () => {
    const pdf = await exportPdf([md('a', '**\u4E2D** *\u6587*')], { fonts: { regular: cjk } });
    const [bold, , italic] = pdf.pages[0].shows;
    expect([bold.mode, bold.skew]).toEqual([2, 0]);
    expect([italic.mode, italic.skew]).toEqual([0, 0.2]);
  });

  it('draws bold text with the bold face the host gave, and code with its monospaced face', async () => {
    const bold = tinyFont({ name: 'TinySans-Bold', glyphs: [['\u4E2D', 1000]] });
    const mono = tinyFont({ name: 'TinyMono', glyphs: [['x', 600]] });
    const pdf = await exportPdf([md('a', '**\u4E2D** `x`')], { fonts: { regular: cjk, bold, mono: mono.buffer as ArrayBuffer } });
    const [strong, , code] = pdf.pages[0].shows;
    expect([strong.font, strong.mode, code.font]).toEqual(['TinySans-Bold', 0, 'TinyMono']);
  });

  it('reports a font it cannot embed, and draws with the standard fonts in its place', async () => {
    const restricted = tinyFont({ glyphs: [['A', 600]], fsType: 2 });
    const pdf = await exportPdf([md('a', 'A')], { fonts: { regular: restricted, italic: new Uint8Array(10) } });
    expect(pdf.problems).toEqual([
      { type: 'font', role: 'regular', reason: 'restricted' },
      { type: 'font', role: 'italic', reason: 'format' },
    ]);
    expect(pdf.shows('A')[0].font).toBe('Helvetica');
  });

  it('writes the same file for the same document and fonts', async () => {
    const blocks = [md('a', '\u4E2D\u6587 Latin')];
    const first = await exportPdf(blocks, { fonts: { regular: cjk } });
    const second = await exportPdf(blocks, { fonts: { regular: cjk } });
    expect(first.bytes).toEqual(second.bytes);
    expect((first.fonts().get('TinySans-Regular') as PdfDict).ToUnicode).toBeDefined();
  });
});
