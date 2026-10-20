import { expect, test, type Page } from '@playwright/test';
import { openEditor } from '../../support/editor';

const FRAMES = 90;

type Sampled = Window & { scrollFrames?: number[] };

const toc = (page: Page) => page.getByRole('navigation', { name: 'Table of contents' });
const entry = (page: Page, name: string) => toc(page).getByRole('link', { name });
const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);

// The page's scroll position at every frame, from just before the action until well after a smooth scroll ends.
async function scrollFrames(page: Page, action: () => Promise<void>): Promise<number[]> {
  await page.evaluate((count) => {
    const frames = [Math.round(window.scrollY)];
    (window as Sampled).scrollFrames = frames;
    const sample = () => {
      frames.push(Math.round(window.scrollY));
      if (frames.length < count) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, FRAMES);
  await action();
  await page.waitForFunction((count) => ((window as Sampled).scrollFrames?.length ?? 0) >= count, FRAMES);
  return page.evaluate(() => (window as Sampled).scrollFrames!);
}

// The share of the whole way down that the first frame to move covers: a glide moves a little at first, a jump most.
function firstStep(frames: number[]): number {
  const [start] = frames;
  const end = frames[frames.length - 1];
  expect(end).toBeGreaterThan(start);
  return ((frames.find((at) => at !== start) ?? start) - start) / (end - start);
}

async function keyboardToUsage(page: Page) {
  await host(page, 'intro').click();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(entry(page, 'Using it')).toBeFocused();
}

for (const readOnly of [false, true]) {
  const query = readOnly ? 'toc=1&readonly=1' : 'toc=1';

  test.describe(readOnly ? 'on a read-only canvas' : 'on an editable canvas', () => {
    test('a click on an entry glides to its heading, which takes the caret at its end', async ({ page }) => {
      await openEditor(page, 'toc', query);
      await expect(host(page, 'usage')).not.toBeInViewport();
      const frames = await scrollFrames(page, () => entry(page, 'Using it').click());
      expect(firstStep(frames)).toBeLessThan(0.5);
      await expect(host(page, 'usage')).toBeFocused();
      await expect(host(page, 'usage')).toBeInViewport();
    });

    test('Enter on an entry glides to its heading', async ({ page }) => {
      await openEditor(page, 'toc', query);
      if (readOnly) await entry(page, 'Using it').focus();
      else await keyboardToUsage(page);
      const frames = await scrollFrames(page, () => page.keyboard.press('Enter'));
      expect(firstStep(frames)).toBeLessThan(0.5);
      await expect(host(page, 'usage')).toBeFocused();
    });

    test('for a reader who prefers reduced motion, a click scrolls to the heading at once', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openEditor(page, 'toc', query);
      const frames = await scrollFrames(page, () => entry(page, 'Using it').click());
      expect(firstStep(frames)).toBe(1);
      await expect(host(page, 'usage')).toBeFocused();
    });
  });
}
