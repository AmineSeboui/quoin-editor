import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { QuoinDiff } from '../../../src/diff';
import { diffAfter, diffBefore, nestedAfter, nestedBefore } from '../../../src/diff/test-support/diff-fixture';
import { axeViolations } from '../../support/axe';
import { answerEveryRequest } from '../../support/network';
import { staticPage, type Theme } from '../../support/static-page';

for (const theme of ['light', 'dark'] satisfies Theme[]) {
  test(`a diff rendered on the server has no accessibility violations in the ${theme} theme`, async ({ page: browser }) => {
    await answerEveryRequest(browser);
    const html = renderToString(createElement(QuoinDiff, { before: diffBefore, after: diffAfter }));
    await browser.goto('/');
    await browser.setContent(staticPage('Server diff', html, theme));
    await expect(browser.locator('.quoin-diff [data-diff="added"] [data-diff-label]')).toHaveText([/^Added/, /^Added/]);
    await expect(browser.locator('.quoin-diff ins').first()).toHaveCSS('text-decoration-line', 'underline');
    await expect(browser.locator('.quoin-diff del').first()).toHaveCSS('text-decoration-line', 'line-through');
    const link = browser.locator('.quoin-diff ins a[href]').first();
    expect(await link.evaluate((node) => getComputedStyle(node).color)).toBe(
      await link.evaluate((node) => getComputedStyle(node.closest('ins')!).color),
    );
    const hidden = await browser.locator('.quoin-diff-hidden').first().boundingBox();
    expect(hidden?.width).toBeLessThanOrEqual(1);
    expect(await axeViolations(browser, 'all', 'main')).toEqual([]);
  });

  test(`a diff of nested lists, toggles and a table has no accessibility violations in the ${theme} theme`, async ({ page: browser }) => {
    await answerEveryRequest(browser);
    const html = renderToString(createElement(QuoinDiff, { before: nestedBefore, after: nestedAfter }));
    await browser.goto('/');
    await browser.setContent(staticPage('Server diff', html, theme));
    await expect(browser.getByText('Deep text')).toBeVisible();
    await expect(browser.locator('.quoin-diff td del').first()).toHaveCSS('text-decoration-line', 'line-through');
    expect(await axeViolations(browser, 'all', 'main')).toEqual([]);
  });
}
