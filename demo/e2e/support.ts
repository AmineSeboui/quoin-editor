import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

const SCROLLING = 'scrollable-region-focusable';
// An editable code block scrolls with the caret, which reaches it through the editor's one tab stop.
const EDITABLE_CODE = '.quoin-code-scroll[data-quoin-native]';

/** Keeps the site from reaching any other host, so a run depends on nothing outside this machine. */
export async function stayLocal(page: Page) {
  await page.route(/^https?:\/\/(?!localhost[:/])/, (route) => route.abort());
}

// Contrast is measured once every finite animation has run.
const settleAnimations = (page: Page) =>
  page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .filter((animation) => Number.isFinite(Number(animation.effect?.getComputedTiming().endTime)))
        .map((animation) => animation.finished),
    ),
  );

/** The ids of the axe rules the whole page breaks, with the node each one names. */
export async function axeViolations(page: Page): Promise<string[]> {
  await settleAnimations(page);
  const { violations } = await new AxeBuilder({ page }).disableRules([SCROLLING]).analyze();
  const scrolling = await new AxeBuilder({ page }).withRules([SCROLLING]).exclude(EDITABLE_CODE).analyze();
  return [...violations, ...scrolling.violations].map(
    (violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
}

/** Waits until every island of the page has replaced its static copy with a live editor. */
export async function waitForIslands(page: Page) {
  const islands = page.locator('[data-island]');
  for (let index = 0; index < (await islands.count()); index++) {
    await islands.nth(index).locator('.quoin-editor').first().waitFor();
  }
}
