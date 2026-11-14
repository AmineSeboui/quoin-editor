import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { pasteShape, WORD_PROCESSOR_PASTES } from '../../../src/engine/test-support/word-processor-pastes';
import { FIXTURE_PNG } from '../../app/fixture-png';
import { onlyHost } from '../../support/block';
import { blocks, caretSettled, openEditor } from '../../support/editor';
import { pasteEvent } from '../../support/synthetic-events';

const fixture = (name: string) => readFileSync(new URL(`../../../src/engine/clipboard/fixtures/${name}`, import.meta.url), 'utf8');

const GOOGLE_PICTURE = 'https://lh7-rt.googleusercontent.com/docsz/AD_4nXdQ0quoinFixture?key=q8mPk0Example';

// A word processor puts its own plain text beside the HTML, which the editor reads only when there is no HTML.
async function pasteInto(page: Page, name: string) {
  const host = onlyHost(page);
  await host.click();
  await caretSettled(page, host);
  await pasteEvent(page, { 'text/html': fixture(name), 'text/plain': 'Quarterly plan' });
}

async function pasteFixture(page: Page, name: string, extra = '') {
  await openEditor(page, 'empty', extra);
  await pasteInto(page, name);
}

type InlineDataWatch = { changes: number; holding: number };

// Counts the changes of the editor from here on, and those whose document or steps hold a picture's data.
async function watchInlineData(page: Page) {
  await page.evaluate(() => {
    const watch: InlineDataWatch = { changes: 0, holding: 0 };
    Object.assign(window, { inlineDataWatch: watch });
    window.__quoin.controller!.editor.subscribe((state, tr) => {
      watch.changes += 1;
      if (JSON.stringify([state.doc.blocks, tr?.steps ?? []]).includes('data:image')) watch.holding += 1;
    });
  });
  return () => page.evaluate(() => (window as Window & { inlineDataWatch?: InlineDataWatch }).inlineDataWatch);
}

const shape = async (page: Page) => (await blocks(page)).map(pasteShape);

for (const [source, name, expected] of WORD_PROCESSOR_PASTES) {
  test(`a paste from ${source} keeps its structure in the canvas`, async ({ page }) => {
    await page.route(/^https:\/\//, (route) => route.abort());
    await pasteFixture(page, name);
    await expect.poll(() => shape(page)).toEqual(expected);
  });
}

test('a picture in a paste from Google Docs is uploaded when the page can read it', async ({ page }) => {
  await page.route(GOOGLE_PICTURE, (route) =>
    route.fulfill({
      contentType: 'image/png',
      headers: { 'access-control-allow-origin': '*' },
      body: Buffer.from(FIXTURE_PNG.base64, 'base64'),
    }),
  );
  await pasteFixture(page, 'google-docs-document.html', 'upload=0');
  await expect
    .poll(async () => (await blocks(page)).find((block) => block.type === 'IMAGE')?.data)
    .toEqual({ storageKey: 'key-AD_4nXdQ0quoinFixture', alt: '', width: FIXTURE_PNG.width, height: FIXTURE_PNG.height });
  await expect(page.locator('.quoin-image img')).toHaveAttribute('src', /^blob:/);
});

test('a picture Word carries inline is uploaded and put in where it was, and never held as its data', async ({ page }) => {
  await openEditor(page, 'empty', 'upload=0');
  const inlineData = await watchInlineData(page);
  await pasteInto(page, 'word-mac-real.html');
  const [, , pasted] = WORD_PROCESSOR_PASTES.find(([, name]) => name === 'word-mac-real.html')!;
  const at = pasted.indexOf('Line 11') + 1;
  const picture = { type: 'IMAGE', storageKey: 'key-image.png', alt: 'A red square', width: 227, height: 177 };
  await expect.poll(() => shape(page)).toEqual([...pasted.slice(0, at), picture, ...pasted.slice(at)]);
  await expect(page.locator('.quoin-image img')).toHaveAttribute('src', /^blob:/);
  expect(await inlineData()).toEqual({ changes: expect.any(Number), holding: 0 });
  expect((await inlineData())!.changes).toBeGreaterThan(1);
});
