import { expect, test, type Page } from '@playwright/test';
import { FIXTURE_PNG } from '../../app/fixture-png';
import { axeViolations } from '../../support/axe';
import { blocks, openEditor } from '../../support/editor';
import { pasteEvent } from '../../support/synthetic-events';

const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const NOCOOKIE = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
const SANDBOX = 'allow-scripts allow-same-origin allow-presentation allow-popups';

// axe scans the frames too, so the page standing in for a provider's is a whole page, its landmark named after it.
const stubPage = (url: string) =>
  `<!doctype html><html lang="en"><title>Stub</title><main aria-label="${encodeURI(url)}"><h1>Stub</h1></main></html>`;

// Every provider, picture and page is answered here: no test depends on the network or on a frame loading.
test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\//, (route) =>
    route.request().url().endsWith('.png')
      ? route.fulfill({ contentType: 'image/png', body: Buffer.from(FIXTURE_PNG.base64, 'base64') })
      : route.fulfill({ contentType: 'text/html', body: stubPage(route.request().url()) }),
  );
});

const options = (page: Page) => page.getByRole('toolbar', { name: 'Link options' });
const youtube = (page: Page) => page.getByTitle('YouTube video');
const types = async (page: Page) => (await blocks(page)).map((block) => block.type);

// The click places the caret through the browser, so its selectionchange has to reach the editor before a key does.
async function caretIn(page: Page, host = page.locator('[data-quoin-host]').first()) {
  await host.click();
  await expect(host).toBeFocused();
  await page.waitForFunction(() => document.activeElement?.contains(document.getSelection()?.focusNode ?? null));
  return host;
}

test('a YouTube link pasted alone on an empty line becomes, by choice, a sandboxed frame from youtube-nocookie.com', async ({
  page,
}) => {
  await openEditor(page, 'empty', 'embed=1');
  const host = await caretIn(page);
  await pasteEvent(page, { 'text/plain': YOUTUBE });
  await expect(options(page)).toBeVisible();
  await expect(host).toBeFocused();
  await options(page).getByRole('button', { name: 'Embed' }).click();

  const frame = youtube(page);
  await expect(frame).toHaveAttribute('src', NOCOOKIE);
  await expect(frame).toHaveAttribute('sandbox', SANDBOX);
  await expect(frame).toHaveAttribute('loading', 'lazy');
  await expect(frame).toHaveAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  expect((await blocks(page))[0].data).toEqual({ url: YOUTUBE, provider: 'youtube' });
  const box = (await frame.boundingBox())!;
  expect(Math.abs(box.width / box.height - 16 / 9)).toBeLessThan(0.02);

  await page.keyboard.press('ControlOrMeta+z');
  await expect(frame).toHaveCount(0);
  await expect.poll(() => types(page)).toEqual(['MARKDOWN']);
});

test('the link options are reached with Alt+F10 and walked with the arrows, and Escape keeps the link', async ({ page }) => {
  await openEditor(page, 'empty', 'embed=1');
  const host = await caretIn(page);
  await pasteEvent(page, { 'text/plain': 'https://example.com/page' });
  await page.keyboard.press('Alt+F10');
  await expect(options(page).getByRole('button', { name: 'Bookmark' })).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(options(page).getByRole('button', { name: 'Keep as link' })).toBeFocused();
  expect(await axeViolations(page, 'all', '[role="toolbar"]')).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(options(page)).toHaveCount(0);
  await expect(host).toBeFocused();
  await page.keyboard.type('!');
  await expect.poll(async () => (await blocks(page))[0].data.markdown).toBe('<https://example.com/page>!');
});

test('a press on an embed selects it rather than its frame, and Enter moves focus into the frame', async ({ page }) => {
  await openEditor(page, 'embeds', 'embed=1');
  const shell = page.locator('[data-block-id="e"]');
  const frame = (await youtube(page).boundingBox())!;
  await page.mouse.click(frame.x + frame.width / 2, frame.y + frame.height / 2);
  await expect(shell).toHaveAttribute('data-selected', 'true');
  await expect(page.locator('[data-quoin-sink]')).toBeFocused();
  await expect(shell.locator('.quoin-embed-cover')).toHaveCount(0);
  await expect(youtube(page)).toHaveAttribute('tabindex', '-1');
  await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute('title'))).toBe('YouTube video');
  expect(await types(page)).toEqual(['MARKDOWN', 'EMBED', 'BOOKMARK', 'EMBED', 'MARKDOWN']);
});

test('/bookmark asks for a link, and the card it places is filled in by the host', async ({ page }) => {
  await openEditor(page, 'empty', 'embed=1');
  await caretIn(page);
  await page.keyboard.type('/bookmark');
  await page.keyboard.press('Enter');
  const field = page.getByRole('textbox', { name: 'Link to bookmark' });
  await expect(field).toBeFocused();
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);
  await page.keyboard.type('quoin.dev/docs');
  await page.keyboard.press('Enter');
  const card = page.getByRole('group', { name: 'Bookmark' });
  await expect(card.getByRole('link', { name: 'Unfurled quoin.dev' })).toHaveAttribute('href', 'https://quoin.dev/docs');
  await expect(card).toContainText('Found by the host');
  await expect(page.locator('[data-quoin-host]').last()).toBeFocused();
});

test('what the host finds for a bookmark lands without taking focus back from the page', async ({ page }) => {
  await openEditor(page, 'empty', 'embed=1&unfurl=400');
  await caretIn(page);
  await page.keyboard.type('/bookmark');
  await page.keyboard.press('Enter');
  await page.keyboard.type('quoin.dev');
  await page.keyboard.press('Enter');
  await page.mouse.click(5, 400);
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await expect(page.getByRole('link', { name: 'Unfurled quoin.dev' })).toBeVisible();
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test('a press in the text while /embed asks for a link places the embed and leaves the caret where it was pressed', async ({
  page,
}) => {
  await openEditor(page, 'sample', 'embed=1');
  const title = page.getByRole('textbox', { name: 'Heading 1' });
  await caretIn(page, page.locator('[data-quoin-host]').last());
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/embed');
  await page.keyboard.press('Enter');
  await page.keyboard.type(YOUTUBE);
  const box = (await title.boundingBox())!;
  await page.mouse.click(box.x + box.width - 2, box.y + box.height / 2);
  await expect(youtube(page)).toBeVisible();
  await expect(title).toBeFocused();
  await page.keyboard.type('!');
  await expect.poll(async () => (await blocks(page)).map((block) => block.data.markdown ?? block.type)).toEqual([
    '# Title!',
    'First paragraph.',
    '',
    'EMBED',
  ]);
});

test('/embed refuses a link no provider frames, and offers a bookmark instead', async ({ page }) => {
  await openEditor(page, 'empty', 'embed=1');
  await caretIn(page);
  await page.keyboard.type('/embed');
  await page.keyboard.press('Enter');
  await page.keyboard.type('example.com/page');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alert')).toHaveText('This link cannot be embedded.');
  expect(await axeViolations(page, 'all', '[role="dialog"]')).toEqual([]);
  await page.getByRole('button', { name: 'Bookmark instead' }).click();
  await expect.poll(() => types(page)).toEqual(['BOOKMARK', 'MARKDOWN']);
});

test('embeds and bookmarks have no accessibility violations, editable or read-only', async ({ page }) => {
  await openEditor(page, 'embeds', 'embed=1');
  await expect(page.getByRole('group', { name: 'Bookmark' }).locator('img')).toBeVisible();
  expect(await axeViolations(page)).toEqual([]);
  const player = (await page.getByTitle('Spotify player').boundingBox())!;
  expect(player.height).toBe(352);

  await openEditor(page, 'embeds', 'embed=1&readonly=1');
  await expect(page.locator('.quoin-embed-cover')).toHaveCount(0);
  await expect(youtube(page)).not.toHaveAttribute('tabindex');
  expect(await axeViolations(page)).toEqual([]);
});
