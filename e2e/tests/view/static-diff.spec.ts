import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { QuoinDiff } from '../../../src/diff';
import { diffAfter, diffBefore } from '../../../src/diff/test-support/diff-fixture';
import { axeViolations } from '../../support/axe';
import { answerEveryRequest } from '../../support/network';

const src = resolve(import.meta.dirname, '..', '..', '..', 'src');
const STYLES = ['ui/tokens.css', 'diff/diff.css'].map((file) => readFileSync(resolve(src, file), 'utf8')).join('\n');
const PAGE_COLOURS = 'body { background: var(--quoin-background); color: var(--quoin-foreground); }';

const page = (body: string, theme: string) =>
  `<!doctype html><html lang="en" class="${theme}"><head><meta charset="utf-8"><title>Server diff</title>` +
  `<style>${STYLES}\n${PAGE_COLOURS}</style></head><body><main>${body}</main></body></html>`;

for (const theme of ['light', 'dark']) {
  test(`a diff rendered on the server has no accessibility violations in the ${theme} theme`, async ({ page: browser }) => {
    await answerEveryRequest(browser);
    const html = renderToString(createElement(QuoinDiff, { before: diffBefore, after: diffAfter }));
    await browser.goto('/');
    await browser.setContent(page(html, theme));
    await expect(browser.locator('.quoin-diff [data-diff="added"] [data-diff-label]')).toHaveText(['Added', 'Added']);
    await expect(browser.locator('.quoin-diff ins').first()).toHaveCSS('text-decoration-line', 'underline');
    await expect(browser.locator('.quoin-diff del').first()).toHaveCSS('text-decoration-line', 'line-through');
    const hidden = await browser.locator('.quoin-diff-hidden').first().boundingBox();
    expect(hidden?.width).toBeLessThanOrEqual(1);
    expect(await axeViolations(browser, 'all', 'main')).toEqual([]);
  });
}
