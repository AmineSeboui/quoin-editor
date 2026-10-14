import { expect, test, type Page } from '@playwright/test';
import { axeViolations } from '../../support/axe';
import { host, markdown, openHeadless } from '../../support/headless';

// The red, green and blue of a colour the page paints with, resolved by a canvas whatever the colour syntax is.
function paintedColor(page: Page, selector: string, property: 'color' | 'backgroundColor') {
  return page.evaluate(
    ([target, name]) => {
      const value = getComputedStyle(document.querySelector(target)!)[name as 'color'];
      const context = document.createElement('canvas').getContext('2d')!;
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data.slice(0, 3));
    },
    [selector, property] as const,
  );
}

const brightness = ([r, g, b]: number[]) => (r + g + b) / 3;

async function selectEveryBlock(page: Page) {
  await host(page, 1).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ControlOrMeta+a');
  await expect(page.locator('[data-quoin-block][data-selected="true"]')).toHaveCount(8);
}

test.describe('a mobile viewport', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('lays the sample document out inside the screen without scrolling sideways', async ({ page }) => {
    await openHeadless(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    for (const block of await page.locator('[data-quoin-block]').all()) {
      const box = (await block.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }
    const [parent, child] = await Promise.all([host(page, 2).boundingBox(), host(page, 3).boundingBox()]);
    expect(child!.x).toBeGreaterThan(parent!.x + 8);
  });

  test('still types, and axe finds nothing at rest or with every block selected', async ({ page }) => {
    await openHeadless(page, 'three');
    await host(page, 0).click();
    await page.keyboard.press('End');
    await page.keyboard.type('!');
    await expect.poll(async () => (await markdown(page))[0]).toBe('Alpha beta gamma!');
    expect(await axeViolations(page)).toEqual([]);
    await openHeadless(page);
    await selectEveryBlock(page);
    expect(await axeViolations(page)).toEqual([]);
  });
});

test.describe('prefers-color-scheme: dark', () => {
  test.use({ colorScheme: 'dark' });

  test('paints the dark palette', async ({ page }) => {
    await openHeadless(page);
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    expect(brightness(await paintedColor(page, 'body', 'backgroundColor'))).toBeLessThan(60);
    expect(brightness(await paintedColor(page, '[data-quoin-host]', 'color'))).toBeGreaterThan(190);
  });

  test('axe finds nothing at rest, with a caret in the text or with every block selected', async ({ page }) => {
    await openHeadless(page);
    expect(await axeViolations(page)).toEqual([]);
    await host(page, 1).click();
    expect(await axeViolations(page)).toEqual([]);
    await selectEveryBlock(page);
    expect(await axeViolations(page)).toEqual([]);
  });
});

test.describe('prefers-color-scheme: light', () => {
  test.use({ colorScheme: 'light' });

  test('paints the light palette', async ({ page }) => {
    await openHeadless(page);
    await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
    expect(brightness(await paintedColor(page, 'body', 'backgroundColor'))).toBeGreaterThan(190);
    expect(brightness(await paintedColor(page, '[data-quoin-host]', 'color'))).toBeLessThan(60);
  });
});
