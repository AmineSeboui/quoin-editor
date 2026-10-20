import { expect, test, type Locator, type Page } from '@playwright/test';
import { host, openHeadless } from '../../support/headless';

const outlineOf = (block: Locator) =>
  block.evaluate((element) => {
    const { outlineStyle, outlineWidth, outlineColor } = getComputedStyle(element);
    return { outlineStyle, outlineWidth, outlineColor };
  });

async function selectDivider(page: Page) {
  await page.emulateMedia({ forcedColors: 'active' });
  await openHeadless(page, 'divider');
  const divider = page.locator('[data-quoin-block][data-type="DIVIDER"]');
  await divider.click();
  await expect(divider).toHaveAttribute('data-selected', 'true');
  return divider;
}

test.describe('forced colors', () => {
  test('a node-selected divider keeps an outline, the one mark that survives when box-shadow and background go', async ({
    page,
  }) => {
    const outline = await outlineOf(await selectDivider(page));
    expect(outline.outlineStyle).not.toBe('none');
    expect(Number.parseFloat(outline.outlineWidth)).toBeGreaterThan(0);
  });

  test('that outline takes a system colour where the emulation forces colours', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'only the Chromium emulation forces colours, WebKit only matches the query');
    const outline = await outlineOf(await selectDivider(page));
    expect(outline.outlineStyle).toBe('solid');
    expect(outline.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('a block that is not selected has no outline', async ({ page }) => {
    await selectDivider(page);
    const other = page.locator('[data-quoin-block]').first();
    await expect(other).not.toHaveAttribute('data-selected', 'true');
    expect((await outlineOf(other)).outlineStyle).toBe('none');
  });

  test('frames the focused text in a 2px solid outline and leaves the rest unframed', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await openHeadless(page, 'three');
    await host(page, 1).click();
    await expect(host(page, 1)).toBeFocused();
    expect(await outlineOf(host(page, 1))).toMatchObject({ outlineStyle: 'solid', outlineWidth: '2px' });
    expect((await outlineOf(host(page, 0))).outlineStyle).toBe('none');
  });

  test('frames the highlighted row of a menu, where its inset bar and background are dropped', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await openHeadless(page);
    await page.evaluate(() => {
      const menu = document.createElement('div');
      menu.className = 'quoin';
      menu.innerHTML = '<div role="menuitem" data-highlighted="">On</div><div role="menuitem">Off</div>';
      document.body.append(menu);
    });
    expect(await outlineOf(page.getByRole('menuitem', { name: 'On' }))).toMatchObject({ outlineStyle: 'solid', outlineWidth: '2px' });
    expect((await outlineOf(page.getByRole('menuitem', { name: 'Off' }))).outlineStyle).toBe('none');
  });
});

test.describe('color-scheme', () => {
  const schemeOf = (page: Page) => page.getByRole('group', { name: 'Document' }).evaluate((root) => getComputedStyle(root).colorScheme);

  test('is light on an editor in a light page', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openHeadless(page);
    expect(await schemeOf(page)).toBe('light');
  });

  test('is dark under a .dark ancestor and on a root that carries .dark itself', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await openHeadless(page);
    await page.evaluate(() => document.body.classList.add('dark'));
    expect(await schemeOf(page)).toBe('dark');
    await page.evaluate(() => {
      document.body.classList.remove('dark');
      document.querySelector('.quoin-editor')!.classList.add('dark');
    });
    expect(await schemeOf(page)).toBe('dark');
  });
});

test.describe('reduced motion', () => {
  const chevron = (page: Page) =>
    page.locator('.quoin-toggle-button svg').evaluate((svg) => getComputedStyle(svg).transitionDuration);

  test('the chevron turns over 120 ms by default', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await openHeadless(page, 'closed');
    expect(await chevron(page)).toBe('0.12s');
  });

  test('the chevron does not animate when the reader asks for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHeadless(page, 'closed');
    expect(await chevron(page)).toBe('0s');
  });

  test('nothing in the editor transitions or scrolls smoothly when the reader asks for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openHeadless(page);
    const motion = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'quoin';
      probe.innerHTML = '<button style="transition: color 200ms; scroll-behavior: smooth">Go</button>';
      document.body.append(probe);
      const { transitionDuration, scrollBehavior } = getComputedStyle(probe.firstElementChild!);
      return { transitionDuration, scrollBehavior };
    });
    expect(motion).toEqual({ transitionDuration: '0s', scrollBehavior: 'auto' });
  });
});
