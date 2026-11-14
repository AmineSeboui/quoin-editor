// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { QuoinBlock } from '../engine/model/quoin-block';
import { exportPdf } from './test-support/export-pdf';
import { type PdfString } from './test-support/parse-pdf';

const md = (id: string, markdown: string, extra: Partial<QuoinBlock> = {}): QuoinBlock => ({ id, type: 'MARKDOWN', data: { markdown }, ...extra });
const rgb = (hex: string) => [0, 2, 4].map((at) => Math.round((parseInt(hex.slice(at, at + 2), 16) / 255) * 1000) / 1000);
const TEXT_WIDTH = 595.28 - 144;

describe('toPdf blocks', () => {
  it('draws headings bold and larger by level, in their colour, on their background and alignment', async () => {
    const pdf = await exportPdf([
      md('h1', '# Title', { data: { markdown: '# Title', color: 'red', background: 'blue', align: 'center' } }),
      md('h2', '## Section'),
      md('h3', '### Part'),
      md('p', 'Body'),
    ]);
    const [title, section, part, body] = ['Title', 'Section', 'Part', 'Body'].map((text) => pdf.shows(text)[0]);
    expect([title.font, section.font, part.font, body.font]).toEqual(['Helvetica-Bold', 'Helvetica-Bold', 'Helvetica-Bold', 'Helvetica']);
    expect([title.size, section.size, part.size, body.size]).toEqual([18, 15, 13, 11]);
    expect(title.color).toEqual(rgb('C9302D'));
    expect(title.x).toBeGreaterThan(250);
    expect(pdf.pages[0].fills).toContainEqual(expect.objectContaining({ x: 72, width: TEXT_WIDTH, color: rgb('E1F3FF') }));
  });

  it('lists the headings in the outline, nested by level, each landing on its heading', async () => {
    const pdf = await exportPdf([md('a', '# One'), md('b', '## Two'), md('c', '# Three')]);
    const outlines = pdf.file.dict(pdf.file.dict(pdf.file.trailer.Root).Outlines);
    expect(outlines.Count).toBe(3);
    const first = pdf.file.dict(outlines.First);
    const title = (entry: typeof first) => new TextDecoder('utf-16be').decode((entry.Title as PdfString).bytes.subarray(2));
    expect([title(first), title(pdf.file.dict(first.First)), title(pdf.file.dict(first.Next))]).toEqual(['One', 'Two', 'Three']);
    const [, , , top] = first.Dest as number[];
    expect(top).toBeGreaterThan(pdf.shows('One')[0].y);
    expect(top - pdf.shows('One')[0].y).toBeLessThan(25);
    const plain = await exportPdf([md('p', 'No headings')]);
    expect(plain.file.dict(plain.file.trailer.Root).Outlines).toBeUndefined();
  });

  it('links each entry of the table of contents to its heading, indented by its nesting', async () => {
    const pdf = await exportPdf([{ id: 'toc', type: 'TOC', data: {} }, md('a', '# One'), md('b', '### Deep'), md('c', '# Two')]);
    const entries = pdf.pages[0].shows.slice(0, 3);
    expect(entries.map(({ text, x, color }) => [text, x, color])).toEqual([
      ['One', 72, rgb('0A71B1')],
      ['Deep', 90, rgb('0A71B1')],
      ['Two', 72, rgb('0A71B1')],
    ]);
    const headings = pdf.pages[0].shows.slice(3);
    expect(pdf.links[0].map(({ page }) => page)).toEqual([0, 0, 0]);
    pdf.links[0].forEach(({ top }, at) => {
      expect(top! - headings[at].y).toBeGreaterThan(0);
      expect(top! - headings[at].y).toBeLessThan(25);
    });
  });

  it('breaks a line where the text has a hard break', async () => {
    const pdf = await exportPdf([md('p', 'one  \ntwo')]);
    expect(pdf.text).toBe('one\ntwo');
  });

  it('draws bullets as discs and squares by level, beside the text indented after them', async () => {
    const pdf = await exportPdf([md('a', '- top'), md('b', '- nested', { indent: 1 }), md('c', '- deeper', { indent: 2 })]);
    const [top, nested, deeper] = ['top', 'nested', 'deeper'].map((text) => pdf.shows(text)[0]);
    expect([top.x, nested.x, deeper.x]).toEqual([90, 114, 138]);
    const fills = pdf.pages[0].fills;
    const left = (show: typeof top) => fills.filter((fill) => fill.x < show.x && fill.x > show.x - 18 && Math.abs(fill.y - show.y) < 8);
    expect(left(top)).toHaveLength(1);
    expect(left(deeper)).toHaveLength(1);
    expect(pdf.pages[0].strokes.filter((stroke) => stroke.points.every(([x]) => x < nested.x && x > nested.x - 18))).toHaveLength(1);
  });

  it('numbers ordered items from their first number, in decimals, letters then roman numerals by level', async () => {
    const pdf = await exportPdf([
      md('a', '3. three'),
      md('b', '4. four'),
      md('c', '1. letter', { indent: 1 }),
      md('d', '2. second', { indent: 1 }),
      md('e', '1. roman', { indent: 2 }),
    ]);
    expect(pdf.text.split('\n')).toEqual(['3.three', '4.four', 'a.letter', 'b.second', 'i.roman']);
    const [number, text] = [pdf.shows('3.')[0], pdf.shows('three')[0]];
    expect(number.x).toBeLessThan(text.x);
  });

  it('draws a task as a checkbox, filled and ticked once done', async () => {
    const pdf = await exportPdf([md('a', '- [x] done'), md('b', '- [ ] open')]);
    const done = pdf.shows('done')[0];
    const open = pdf.shows('open')[0];
    const { fills, strokes } = pdf.pages[0];
    expect(fills.filter((fill) => fill.x < done.x && Math.abs(fill.y - done.y) < 8)).toEqual([expect.objectContaining({ color: rgb('0A71B1') })]);
    expect(strokes.filter((stroke) => stroke.points.every(([x]) => x < done.x) && Math.abs(stroke.points[0][1] - done.y) < 12)).toEqual([
      expect.objectContaining({ color: [1, 1, 1] }),
    ]);
    expect(strokes.filter((stroke) => stroke.points.every(([x]) => x < open.x) && Math.abs(stroke.points[0][1] - open.y) < 12)).toEqual([
      expect.objectContaining({ color: rgb('595959') }),
    ]);
  });

  it('draws quote lines grey and italic beside one bar for the lines that follow on from each other', async () => {
    const pdf = await exportPdf([md('a', '> first'), md('b', '> second'), md('c', 'after')]);
    const [first, second] = [pdf.shows('first')[0], pdf.shows('second')[0]];
    expect([first.font, first.color]).toEqual(['Helvetica-Oblique', rgb('595959')]);
    const bars = pdf.pages[0].fills.filter((fill) => fill.width === 3);
    expect(bars).toHaveLength(1);
    expect(bars[0].x).toBe(72);
    expect(bars[0].y).toBeLessThan(second.y);
    expect(bars[0].y + bars[0].height).toBeGreaterThan(first.y);
    expect(first.x).toBe(84);
  });

  it('draws a divider as a rule across the text width', async () => {
    const pdf = await exportPdf([{ id: 'd', type: 'DIVIDER', data: {} }]);
    expect(pdf.pages[0].fills).toEqual([expect.objectContaining({ x: 72, width: TEXT_WIDTH, height: 0.75, color: rgb('BFBFBF') })]);
  });

  it('draws a callout on the ground of its tone, its icon before its body', async () => {
    const pdf = await exportPdf([{ id: 'c', type: 'CALLOUT', data: { tone: 'warning', icon: '!', body: 'Mind **the** gap' } }]);
    expect(pdf.text).toBe('! Mind the gap');
    expect(pdf.shows('the')[0].font).toBe('Helvetica-Bold');
    const [ground] = pdf.pages[0].fills;
    expect(ground).toMatchObject({ x: 72, width: TEXT_WIDTH, color: rgb('FDF4D2') });
    const body = pdf.shows('Mind')[0];
    expect(ground.y).toBeLessThan(body.y);
    expect(ground.y + ground.height).toBeGreaterThan(body.y + 11);
    const danger = await exportPdf([{ id: 'c', type: 'CALLOUT', data: { tone: 'danger', body: 'x' } }]);
    expect(danger.pages[0].fills[0].color).toEqual(rgb('FDE9E8'));
  });

  it('draws code in Courier on a grey ground, keeping its lines, tabs and indentation, and wrapping a long line', async () => {
    const code = 'if (a) {\n\treturn b;\n}\n' + 'x'.repeat(120);
    const pdf = await exportPdf([{ id: 'c', type: 'CODE', data: { language: 'ts', code } }]);
    expect(pdf.text.split('\n').slice(0, 3)).toEqual(['if (a) {', '    return b;', '}']);
    expect(pdf.text.replace(/\n/g, '')).toContain('x'.repeat(120));
    expect(pdf.text.split('\n').length).toBeGreaterThan(4);
    expect(new Set(pdf.pages[0].shows.map(({ font }) => font))).toEqual(new Set(['Courier']));
    expect(pdf.pages[0].fills[0]).toMatchObject({ x: 72, width: TEXT_WIDTH, color: rgb('F0F0F0') });
  });

  it('draws a toggle as its summary followed by what it holds, open or closed', async () => {
    const pdf = await exportPdf([
      { id: 't', type: 'TOGGLE', data: { markdown: 'Summary', open: false } },
      md('i', 'inside', { indent: 1 }),
    ]);
    expect(pdf.text).toBe('Summary\ninside');
    expect(pdf.shows('inside')[0].x).toBe(96);
  });

  it('draws a table in equal columns with borders, its header row bold and shaded, its cells aligned and wrapped', async () => {
    const long = 'wrapped '.repeat(30).trim();
    const pdf = await exportPdf([
      { id: 't', type: 'TABLE', data: { rows: [['Name', 'Role'], ['Ada', long]], header: true, align: [null, 'right'] } },
    ]);
    const [name, role] = [pdf.shows('Name')[0], pdf.shows('Role')[0]];
    expect([name.font, name.size]).toEqual(['Helvetica-Bold', 10]);
    expect(name.x).toBe(77);
    expect(role.x).toBeGreaterThan(72 + TEXT_WIDTH / 2 + 150);
    expect(pdf.shows('wrapped').length).toBeGreaterThan(2);
    expect(pdf.text.match(/wrapped/g)).toHaveLength(30);
    const borders = pdf.pages[0].strokes;
    expect(borders).toHaveLength(4);
    const header = pdf.pages[0].fills.find((fill) => fill.width === TEXT_WIDTH)!;
    expect(header.color).toEqual(rgb('F0F0F0'));
    const bodyRow = borders[3].points;
    expect(bodyRow[1][1] - bodyRow[0][1]).toBeGreaterThan(3 * 13.5);
  });

  it('draws a table with no header row in the regular face, and nothing for a table with no cells', async () => {
    const pdf = await exportPdf([
      { id: 't', type: 'TABLE', data: { rows: [['a', 'b']], header: false, align: [] } },
      { id: 'e', type: 'TABLE', data: { rows: [], header: true, align: [] } },
    ]);
    expect(pdf.shows('a')[0].font).toBe('Helvetica');
    expect(pdf.pages[0].fills).toHaveLength(0);
  });

  it('breaks a long table between its rows, and a row taller than a page between its lines', async () => {
    const rows = [['Head', 'Other'], ...Array.from({ length: 80 }, (_, at) => [`row ${at}`, 'cell'])];
    const pdf = await exportPdf([{ id: 't', type: 'TABLE', data: { rows, header: true, align: [] } }]);
    expect(pdf.pages.length).toBeGreaterThan(1);
    expect(pdf.text.match(/row \d+/g)).toHaveLength(80);
    const tall = await exportPdf([{ id: 't', type: 'TABLE', data: { rows: [['word '.repeat(2500).trim()]], header: false, align: [] } }]);
    expect(tall.pages.length).toBeGreaterThan(1);
    expect(tall.text.match(/word/g)).toHaveLength(2500);
  });

  it('links embeds and bookmarks to their addresses, and a file to its stored address', async () => {
    const pdf = await exportPdf(
      [
        { id: 'e', type: 'EMBED', data: { url: 'https://quoin.dev/page' } },
        { id: 'b', type: 'BOOKMARK', data: { url: 'https://quoin.dev/docs', title: 'Quoin & docs' } },
        { id: 'f', type: 'FILE', data: { storageKey: 'notes.pdf', filename: 'notes <1>.pdf' } },
        { id: 'n', type: 'EMBED', data: { url: '' } },
      ],
      { resolveAssetUrl: (key) => `https://assets.test/${key}` },
    );
    expect(pdf.text).toBe('https://quoin.dev/page\nQuoin & docs\nnotes <1>.pdf');
    expect(pdf.links[0].map(({ uri }) => uri)).toEqual(['https://quoin.dev/page', 'https://quoin.dev/docs', 'https://assets.test/notes.pdf']);
  });

  it('writes a file at a relative address as its name, and links it against baseUrl when given one', async () => {
    const blocks = [{ id: 'f', type: 'FILE', data: { storageKey: 'r.pdf', filename: 'report.pdf' } }];
    const resolveAssetUrl = (key: string) => `/files/${key}`;
    expect((await exportPdf(blocks, { resolveAssetUrl })).links[0]).toEqual([]);
    const based = await exportPdf(blocks, { resolveAssetUrl, baseUrl: 'https://app.example/doc/1' });
    expect(based.links[0].map(({ uri }) => uri)).toEqual(['https://app.example/files/r.pdf']);
  });

  it('writes math as its source in Courier, and a block type it does not know as its type in brackets', async () => {
    const pdf = await exportPdf([
      { id: 'm', type: 'MATH', data: { latex: 'e^{i\\pi} + 1 = 0' } },
      { id: 'x', type: 'CHART', data: { points: [1, 2] } },
    ]);
    expect(pdf.shows('e^{i\\pi}')[0].font).toBe('Courier');
    expect(pdf.shows('[CHART]')[0].font).toBe('Helvetica-Oblique');
  });
});
