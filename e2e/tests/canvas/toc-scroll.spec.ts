import { expect, test, type Page } from '@playwright/test';
import { openEditor } from '../../support/editor';

const FRAMES = 90;

type Sampled = Window & { scrollFrames?: number[]; scrollHandled?: number };
type Scrolled = { start: number; handled: number; end: number };

const toc = (page: Page) => page.getByRole('navigation', { name: 'Table of contents' });
const entry = (page: Page, name: string) => toc(page).getByRole('link', { name });
const host = (page: Page, id: string) => page.locator(`[data-block-id="${id}"] [data-quoin-host]`);

// Where the page had scrolled to before the action, once the click it makes on an entry was handled, and once a
// smooth scroll is long over. The page listens after the canvas, so it reads the scroll the handler left.
async function scrollOf(page: Page, action: () => Promise<void>): Promise<Scrolled> {
  await page.evaluate((count) => {
    const sampled = window as Sampled;
    const frames = [Math.round(window.scrollY)];
    sampled.scrollFrames = frames;
    document.addEventListener('click', () => (sampled.scrollHandled = Math.round(window.scrollY)), { once: true });
    const sample = () => {
      frames.push(Math.round(window.scrollY));
      if (frames.length < count) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, FRAMES);
  await action();
  await page.waitForFunction((count) => ((window as Sampled).scrollFrames?.length ?? 0) >= count, FRAMES);
  return page.evaluate((): Scrolled => {
    const { scrollFrames: frames = [], scrollHandled = NaN } = window as Sampled;
    return { start: frames[0], handled: scrollHandled, end: frames[frames.length - 1] };
  });
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
      const { start, handled, end } = await scrollOf(page, () => entry(page, 'Using it').click());
      expect(handled).toBe(start);
      expect(end).toBeGreaterThan(start);
      await expect(host(page, 'usage')).toBeFocused();
      await expect(host(page, 'usage')).toBeInViewport();
    });

    test('Enter on an entry glides to its heading', async ({ page }) => {
      await openEditor(page, 'toc', query);
      if (readOnly) await entry(page, 'Using it').focus();
      else await keyboardToUsage(page);
      const { start, handled, end } = await scrollOf(page, () => page.keyboard.press('Enter'));
      expect(handled).toBe(start);
      expect(end).toBeGreaterThan(start);
      await expect(host(page, 'usage')).toBeFocused();
    });

    test('for a reader who prefers reduced motion, a click scrolls to the heading at once', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openEditor(page, 'toc', query);
      const { start, handled, end } = await scrollOf(page, () => entry(page, 'Using it').click());
      expect(handled - start).toBeGreaterThan(0.9 * (end - start));
      await expect(host(page, 'usage')).toBeFocused();
    });
  });
}
