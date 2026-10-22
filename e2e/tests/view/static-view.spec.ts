import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { QuoinView } from '../../../src/view-static';
import { everyBlockDocument, everyBlockOptions } from '../../../src/view-static/test-support/every-block-document';
import { axeViolations } from '../../support/axe';
import { answerEveryRequest } from '../../support/network';
import { staticPage, type Theme } from '../../support/static-page';

for (const theme of ['light', 'dark'] satisfies Theme[]) {
  test(`a document rendered on the server has no accessibility violations in the ${theme} theme`, async ({ page: browser }) => {
    await answerEveryRequest(browser);
    const html = renderToString(createElement(QuoinView, { blocks: everyBlockDocument, className: 'doc', ...everyBlockOptions }));
    await browser.goto('/');
    await browser.setContent(staticPage('Server view', html, theme));
    await expect(browser.locator('.doc h1')).toHaveText('Every block');
    await expect(browser.locator('.doc details[open] > summary')).toHaveText('Open toggle');
    expect(await axeViolations(browser, 'all', 'main')).toEqual([]);
  });
}
