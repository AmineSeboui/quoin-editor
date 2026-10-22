import { expect, test } from '@playwright/test';
import { textOf, unzip } from '../../../src/docx/test-support/unzip';

test('the every-block document exports to a Word file in the browser', async ({ page }) => {
  await page.goto('/docx.html');
  await page.waitForFunction(() => window.__quoinDocx !== undefined);
  const file = await page.evaluate(() => window.__quoinDocx!());
  expect(file.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  expect(String.fromCharCode(...file.head)).toBe('PK\u0003\u0004');
  expect(file.size).toBe(file.bytes.length);
  expect(file.size).toBeGreaterThan(4_000);
  const entries = unzip(Uint8Array.from(file.bytes));
  expect([...entries.keys()]).toContain('word/media/image1.png');
  const body = textOf(entries, 'word/document.xml');
  expect(body).toContain('>Catalogue</w:t>');
  expect(body).toContain('<w:tbl>');
});
