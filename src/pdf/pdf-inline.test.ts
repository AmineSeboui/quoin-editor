// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { PdfOptions } from './index';
import { exportPdf } from './test-support/export-pdf';

const rgb = (hex: string) => [0, 2, 4].map((at) => Math.round((parseInt(hex.slice(at, at + 2), 16) / 255) * 1000) / 1000);
const line = (markdown: string, options?: PdfOptions) => exportPdf([{ id: 'p', type: 'MARKDOWN', data: { markdown } }], options);

describe('toPdf inline marks', () => {
  it('draws bold, italic and both in the matching Helvetica face', async () => {
    const pdf = await line('**bold** *italic* ***both*** plain');
    expect(['bold', 'italic', 'both', 'plain'].map((text) => pdf.shows(text)[0].font)).toEqual([
      'Helvetica-Bold',
      'Helvetica-Oblique',
      'Helvetica-BoldOblique',
      'Helvetica',
    ]);
  });

  it('rules underlined text below its baseline and struck text through it, in its colour', async () => {
    const pdf = await line('<u>under</u> ~~strike~~');
    const [text] = pdf.shows('under strike');
    const rules = pdf.pages[0].fills;
    expect(rules).toHaveLength(2);
    expect(rules[0].x).toBe(text.x);
    expect(rules[0].y).toBeLessThan(text.y);
    expect(rules[1].x).toBeGreaterThan(rules[0].x + rules[0].width);
    expect(rules[1].y).toBeGreaterThan(text.y);
    expect(rules.every(({ color }) => color.join() === rgb('0A0A0A').join())).toBe(true);
  });

  it('draws inline code in Courier on a grey ground', async () => {
    const pdf = await line('a `code` b');
    expect(pdf.shows('code')[0].font).toBe('Courier');
    expect(pdf.pages[0].fills).toEqual([expect.objectContaining({ color: rgb('F0F0F0') })]);
  });

  it('draws subscripts and superscripts smaller, below and above the baseline', async () => {
    const pdf = await line('x<sub>sub</sub> x<sup>sup</sup>');
    const [base, sub, sup] = [pdf.shows('x')[0], pdf.shows('sub')[0], pdf.shows('sup')[0]];
    expect([sub.size, sup.size]).toEqual([7.7, 7.7]);
    expect(sub.y).toBeLessThan(base.y);
    expect(sup.y).toBeGreaterThan(base.y);
  });

  it('colours text and fills its highlight and background from the palette, yellow for a plain highlight', async () => {
    const pdf = await line('<mark>plain</mark> <mark data-color="green">green</mark> <span data-color="red">red</span> <span data-bg="blue">blue</span>');
    expect(pdf.pages[0].fills.map(({ color }) => color)).toEqual([rgb('FDF4D2'), rgb('E1F7E7'), rgb('E1F3FF')]);
    expect(pdf.shows('red')[0].color).toEqual(rgb('C9302D'));
  });

  it('links a safe address with an annotation over its text, drawn in the link colour and underlined', async () => {
    const pdf = await line('see [the docs](https://quoin.dev "Docs") now');
    const [annotation] = pdf.links[0];
    expect(annotation.uri).toBe('https://quoin.dev');
    const text = pdf.shows('the docs')[0];
    expect(text.color).toEqual(rgb('0A71B1'));
    expect(annotation.rect[0]).toBeCloseTo(text.x);
    expect(annotation.rect[1]).toBeLessThan(text.y);
    expect(annotation.rect[3]).toBeGreaterThan(text.y);
    expect(pdf.pages[0].fills).toEqual([expect.objectContaining({ color: rgb('0A71B1') })]);
  });

  it('writes an unsafe, relative, network or mention link as its text with no annotation', async () => {
    const pdf = await line('[a](javascript:alert(1)) [b](/relative) [c](//host/x) [@Ada](mention:user:1) [d](#top)');
    expect(pdf.links[0]).toEqual([]);
    expect(pdf.text).toBe('a b c @Ada d');
  });

  it('reads a relative link against baseUrl, and writes an address outside ASCII percent-encoded', async () => {
    const pdf = await line('[a](/files/r.pdf) [b](https://quoin.dev/caf\u00E9)', { baseUrl: 'https://app.example/doc/1' });
    expect(pdf.links[0].map(({ uri }) => uri)).toEqual(['https://app.example/files/r.pdf', 'https://quoin.dev/caf%C3%A9']);
  });

  it('writes atoms as their plain text, math in Courier', async () => {
    const pdf = await line('Ask [@Ada Lovelace](mention:user:1) about $x^2$');
    expect(pdf.text).toBe('Ask @Ada Lovelace about x^2');
    expect(pdf.shows('x^2')[0].font).toBe('Courier');
  });

  it('draws the Latin characters of the standard fonts as themselves, typographic ones included', async () => {
    const text = 'Caf\u00E9 \u00C5ngstr\u00F6m \u20AC5 \u201Cquoted\u201D \u2014 na\u00EFve \u2026';
    const pdf = await line(text);
    expect(pdf.text).toBe(text);
    expect(pdf.problems).toEqual([]);
  });

  it('spreads the words of a justified paragraph to the full width, but not its last line', async () => {
    const words = Array.from({ length: 60 }, (_, at) => `w${at}`).join(' ');
    const pdf = await exportPdf([{ id: 'p', type: 'MARKDOWN', data: { markdown: words, align: 'justify' } }]);
    const content = new TextDecoder().decode(pdf.file.stream(pdf.file.pages[0].Contents));
    const shows = content.split('\n').filter((operators) => operators.includes('TJ'));
    expect(shows.length).toBeGreaterThan(1);
    expect(shows.slice(0, -1).every((operators) => /> -[\d.]+ </.test(operators))).toBe(true);
    expect(/> -[\d.]+ </.test(shows[shows.length - 1])).toBe(false);
  });

  it('places right-aligned text against the right margin', async () => {
    const pdf = await exportPdf([{ id: 'p', type: 'MARKDOWN', data: { markdown: 'iiii', align: 'right' } }]);
    expect(pdf.shows('iiii')[0].x).toBeCloseTo(595.28 - 72 - 4 * 2.442, 2);
  });
});
