import { expect, test } from '@playwright/test';
import { pageText } from '../../../src/pdf/test-support/page-content';
import { readPdf } from '../../../src/pdf/test-support/read-pdf';

test('the every-block document exports to a PDF in the browser', async ({ page }) => {
  await page.goto('/pdf.html');
  await page.waitForFunction(() => window.__quoinPdf !== undefined);
  const file = await page.evaluate(() => window.__quoinPdf!());
  expect(file.type).toBe('application/pdf');
  expect(file.size).toBe(file.bytes.length);
  expect(file.problems).toEqual([{ type: 'glyphs', blockId: 'text', characters: '\u{1F389}' }]);
  const pdf = readPdf(Uint8Array.from(file.bytes));
  expect([...pdf.reachable()].sort((a, b) => a - b)).toEqual([...pdf.objects.keys()].sort((a, b) => a - b));
  const text = pdf.pages.map((_, index) => pageText(pdf, index)).join('\n');
  expect(text).toContain('Catalogue');
  expect(text).toContain('Author');
  const images = Object.keys(pdf.dict(pdf.dict(pdf.pages[0].Resources).XObject ?? {}));
  expect(images).toEqual(['Im1']);
});
