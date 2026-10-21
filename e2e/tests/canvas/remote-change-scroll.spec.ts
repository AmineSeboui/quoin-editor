import { expect, test, type Page } from '@playwright/test';
import { openEditor } from '../../support/editor';

test.use({ viewport: { width: 700, height: 500 } });

const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const scrolled = (page: Page) => page.evaluate(() => window.scrollY);

async function scrollAway(page: Page) {
  // Scroll anchoring would move the page by the height of the removed block, which is not a reveal.
  await page.addStyleTag({ content: 'html, body { overflow-anchor: none } body { padding-bottom: 3000px }' });
  await page.evaluate(() => window.scrollTo({ top: 2000, behavior: 'instant' }));
  await expect.poll(() => scrolled(page)).toBeGreaterThan(500);
  return scrolled(page);
}

async function removeRemotely(page: Page, id: string) {
  await page.evaluate((block) => window.__quoin.removeRemotely!(block), id);
  await expect(page.locator(`[data-block-id="${id}"]`)).toHaveCount(0);
  await page.waitForTimeout(300);
}

test.describe('a collaborator removing the block the writer has selected, out of view', () => {
  test('leaves the page where it is while the block is selected whole', async ({ page }) => {
    await openEditor(page, 'forty');
    await host(page, 'p2').click();
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-block-id="p2"]')).toHaveAttribute('data-selected', 'true');
    const at = await scrollAway(page);
    await removeRemotely(page, 'p2');
    await expect(page.locator('[data-block-id="p3"]')).toHaveAttribute('data-selected', 'true');
    expect(await scrolled(page)).toBe(at);
  });

  test('leaves the page where it is while the caret is in it, and keeps focus in the editor', async ({ page }) => {
    await openEditor(page, 'forty');
    await host(page, 'p2').click();
    await expect(host(page, 'p2')).toBeFocused();
    const at = await scrollAway(page);
    await removeRemotely(page, 'p2');
    expect(await scrolled(page)).toBe(at);
    expect(await page.evaluate(() => document.activeElement?.closest('[data-quoin-host]') !== null)).toBe(true);
  });
});
