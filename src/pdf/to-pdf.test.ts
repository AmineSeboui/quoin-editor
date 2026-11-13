// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FIXTURE_PNG } from '../../e2e/app/fixture-png';
import { everyBlockDocument } from '../view-static/test-support/every-block-document';
import { exportPdf } from './test-support/export-pdf';
import { PdfName, type PdfString } from './test-support/parse-pdf';

const png = () => Promise.resolve(Uint8Array.from(Buffer.from(FIXTURE_PNG.base64, 'base64')));
const options = { resolveAssetUrl: (key: string) => `https://assets.test/${key}`, fetchAsset: png, title: 'Every <block>' };

const paragraphs = (count: number, words = 60) =>
  Array.from({ length: count }, (_, at) => ({
    id: `p${at}`,
    type: 'MARKDOWN',
    data: { markdown: `Paragraph ${at}: ${Array.from({ length: words }, (_, word) => `word${word}`).join(' ')}` },
  }));

describe('toPdf', () => {
  it('runs in a process with no DOM', () => {
    expect(typeof document).toBe('undefined');
    expect(typeof window).toBe('undefined');
  });

  it('writes a PDF whose cross-reference table finds every object, every object reachable from the trailer', async () => {
    const pdf = await exportPdf(everyBlockDocument, options);
    expect(pdf.blob.type).toBe('application/pdf');
    expect(pdf.file.version).toBe('1.7');
    expect([...pdf.file.reachable()].sort((a, b) => a - b)).toEqual([...pdf.file.objects.keys()].sort((a, b) => a - b));
    expect(pdf.file.trailer.Size).toBe(pdf.file.objects.size + 1);
  });

  it('deflates every stream it writes, and each one inflates', async () => {
    const pdf = await exportPdf(everyBlockDocument, options);
    const streams = [...pdf.file.objects.values()].filter(({ data }) => data !== undefined);
    expect(streams.length).toBeGreaterThan(3);
    for (const { value } of streams) expect((value as { Filter?: PdfName }).Filter).toEqual(new PdfName('FlateDecode'));
  });

  it('writes the title into the document properties and asks a reader to show it', async () => {
    const pdf = await exportPdf(everyBlockDocument, options);
    const info = pdf.file.dict(pdf.file.trailer.Info);
    expect(new TextDecoder('utf-16be').decode((info.Title as PdfString).bytes.subarray(2))).toBe('Every <block>');
    expect(pdf.file.dict(pdf.file.dict(pdf.file.trailer.Root).ViewerPreferences).DisplayDocTitle).toBe(true);
    const untitled = await exportPdf([]);
    expect(untitled.file.dict(untitled.file.trailer.Info).Title).toBeUndefined();
  });

  it('writes an empty document as one blank page', async () => {
    const pdf = await exportPdf([]);
    expect(pdf.pages).toHaveLength(1);
    expect(pdf.text).toBe('');
  });

  it('writes the same file for the same document', async () => {
    const first = await exportPdf(everyBlockDocument, options);
    const second = await exportPdf(everyBlockDocument, options);
    expect(first.bytes).toEqual(second.bytes);
  });

  it('draws A4 pages by default and Letter pages on request', async () => {
    const a4 = await exportPdf([]);
    expect(a4.file.pages[0].MediaBox).toEqual([0, 0, 595.28, 841.89]);
    const letter = await exportPdf([], { pageSize: 'letter' });
    expect(letter.file.pages[0].MediaBox).toEqual([0, 0, 612, 792]);
  });

  it('starts the text at the margins it is given', async () => {
    const blocks = [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'Margin' } }];
    const [standard] = (await exportPdf(blocks)).shows('Margin');
    expect(standard.x).toBe(72);
    const [narrow] = (await exportPdf(blocks, { margin: { left: 36, top: 20 } })).shows('Margin');
    expect(narrow.x).toBe(36);
    expect(narrow.y).toBeGreaterThan(standard.y + 40);
    const [even] = (await exportPdf(blocks, { margin: 50 })).shows('Margin');
    expect(even.x).toBe(50);
  });

  it('reduces margins that would leave less than an inch of text, and ignores ones that are no length', async () => {
    const blocks = [{ id: 'a', type: 'MARKDOWN', data: { markdown: 'Margin' } }];
    const [wide] = (await exportPdf(blocks, { margin: { left: 600, right: 600 } })).shows('Margin');
    expect(wide.x).toBeCloseTo((595.28 - 72) / 2, 1);
    const [invalid] = (await exportPdf(blocks, { margin: { left: -5 } })).shows('Margin');
    expect(invalid.x).toBe(72);
  });

  it('flows a long document onto as many pages as it needs, breaking between lines and losing none', async () => {
    const pdf = await exportPdf(paragraphs(40));
    expect(pdf.pages.length).toBeGreaterThan(3);
    const words = pdf.text.split(/\s+/).filter((word) => word.startsWith('word')).length;
    expect(words).toBe(40 * 60);
    expect(pdf.text.indexOf('Paragraph 0:')).toBeLessThan(pdf.text.indexOf('Paragraph 39:'));
    for (const page of pdf.pages) {
      for (const show of page.shows) {
        expect(show.y).toBeGreaterThanOrEqual(72 - 11);
        expect(show.y).toBeLessThanOrEqual(841.89 - 72);
      }
    }
  });

  it('breaks a page between the lines of one paragraph that does not fit', async () => {
    const pdf = await exportPdf(paragraphs(1, 1500));
    expect(pdf.pages.length).toBeGreaterThan(1);
    expect(pdf.pages.every((page) => page.shows.length > 10)).toBe(true);
  });
});
