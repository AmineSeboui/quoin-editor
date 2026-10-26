import { expect, test, type Page } from '@playwright/test';
import { openEditor } from '../../support/editor';

const hostOf = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);
const ghost = (page: Page) => page.locator('.quoin-ai-ghost');
const push = (page: Page, chunk: string) => page.evaluate((text) => window.__quoinAi!.push(text), chunk);
const topOf = (page: Page, id: string) =>
  page.evaluate((block) => document.querySelector(`[data-block-id="${block}"]`)!.getBoundingClientRect().top, id);

async function askAboutFirstWord(page: Page) {
  await openEditor(page, 'ai', 'ai=1');
  await hostOf(page, 'p').dblclick({ position: { x: 6, y: 10 } });
  await page.getByRole('toolbar', { name: 'Text formatting' }).getByRole('button', { name: 'Ask AI' }).click();
  await page.keyboard.type('improve');
  await page.keyboard.press('Enter');
}

// WebKit before scroll anchoring, and any page that turns it off, keep the scroll offset as content above grows.
for (const anchoring of ['auto', 'none']) {
  test(`keeps the text a reader is on still while an answer above it grows, with scroll anchoring ${anchoring}`, async ({
    page,
  }) => {
    await askAboutFirstWord(page);
    await push(page, 'One');
    await expect(ghost(page)).toHaveText('One');
    await page.evaluate((value) => {
      document.documentElement.style.overflowAnchor = value;
      document.body.style.paddingBottom = '3000px';
      const below = document.querySelector('[data-block-id="p"]')!.getBoundingClientRect().bottom;
      window.scrollTo(0, window.scrollY + below + 2);
    }, anchoring);
    await expect.poll(() => topOf(page, 'r')).toBeGreaterThan(0);
    const before = await topOf(page, 'r');
    for (const chunk of ['\n\nTwo', '\n\nThree', '\n\nFour']) {
      await push(page, chunk);
      await expect(ghost(page)).toContainText(chunk.trim());
      await page.evaluate(() => new Promise(requestAnimationFrame));
      expect(Math.abs((await topOf(page, 'r')) - before)).toBeLessThanOrEqual(1);
    }
  });
}
