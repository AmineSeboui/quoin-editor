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

// WebKit before scroll anchoring, and any page that turns it off, keep the scroll offset as content above grows; a
// page that scrolls smoothly would ease each correction in, losing what the next growth adds before it lands.
for (const [anchoring, behavior] of [
  ['auto', 'auto'],
  ['none', 'auto'],
  ['none', 'smooth'],
]) {
  test(`keeps the text a reader is on still while an answer above it grows, with scroll anchoring ${anchoring} and ${behavior} scrolling`, async ({
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
    await page.evaluate((value) => (document.documentElement.style.scrollBehavior = value), behavior);
    await expect.poll(() => topOf(page, 'r')).toBeGreaterThan(0);
    const before = await topOf(page, 'r');
    for (const chunk of ['\n\nTwo', '\n\nThree', '\n\nFour']) {
      await push(page, chunk);
      await expect(ghost(page)).toContainText(chunk.trim());
      await page.evaluate(() => new Promise(requestAnimationFrame));
      expect(Math.abs((await topOf(page, 'r')) - before)).toBeLessThanOrEqual(1);
    }
    await page.waitForTimeout(500);
    expect(Math.abs((await topOf(page, 'r')) - before)).toBeLessThanOrEqual(1);
  });
}

const spacing = (page: Page) =>
  page.evaluate(() => {
    const layer = document.querySelector('.quoin-ai-layer')!.getBoundingClientRect();
    const text = document.querySelector('[data-block-id="p"] [data-quoin-host]')!.getBoundingClientRect();
    const next = document.querySelector('[data-block-id="q"]')!.getBoundingClientRect();
    return { above: Math.round(layer.top - text.bottom), below: Math.round(next.top - layer.bottom) };
  });

test("keeps room for an answer that uses the block's own padding and the gap of a flex or grid canvas first", async ({
  page,
}) => {
  await askAboutFirstWord(page);
  await page.addStyleTag({
    content: `.quoin.quoin-editor { display: flex; flex-direction: column; row-gap: 12px }
      .quoin [data-quoin-block] { padding-bottom: 20px }`,
  });
  for (const chunk of ['One', '\n\nTwo', '\n\nThree']) {
    await push(page, chunk);
    await expect(ghost(page)).toContainText(chunk.trim());
  }
  await expect.poll(() => spacing(page)).toEqual({ above: 4, below: 4 });
});

test('shows the answer only where every box around its text that clips lets it', async ({ page }) => {
  await askAboutFirstWord(page);
  await push(page, 'Get');
  await expect(ghost(page)).toHaveText('Get');
  await page.evaluate(() => {
    const shell = document.querySelector<HTMLElement>('[data-block-id="p"]')!;
    const host = shell.querySelector<HTMLElement>('[data-quoin-host]')!;
    const scroller = document.createElement('div');
    Object.assign(scroller.style, { overflowX: 'auto', width: '600px' });
    host.replaceWith(scroller);
    scroller.append(host);
    Object.assign(shell.style, { overflowX: 'clip', width: '300px' });
    host.style.width = '1200px';
  });
  const right = await page.locator('[data-block-id="p"]').evaluate((shell) => shell.getBoundingClientRect().right);
  await expect
    .poll(() =>
      page.locator('.quoin-ai-layer').evaluate((layer) => {
        const inset = getComputedStyle(layer).clipPath.match(/[\d.]+/g)?.map(Number) ?? [0, 0];
        return layer.getBoundingClientRect().right - inset[1];
      }),
    )
    .toBeLessThanOrEqual(right + 1);
});
