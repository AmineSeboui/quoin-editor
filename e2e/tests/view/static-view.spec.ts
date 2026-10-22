import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { QuoinView } from '../../../src/view-static';
import { everyBlockDocument, everyBlockOptions } from '../../../src/view-static/test-support/every-block-document';
import { axeViolations } from '../../support/axe';
import { answerEveryRequest } from '../../support/network';

const page = (body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Server view</title></head><body><main>${body}</main></body></html>`;

test('a document rendered on the server has no accessibility violations', async ({ page: browser }) => {
  await answerEveryRequest(browser);
  const html = renderToString(createElement(QuoinView, { blocks: everyBlockDocument, className: 'doc', ...everyBlockOptions }));
  await browser.goto('/');
  await browser.setContent(page(html));
  await expect(browser.locator('.doc h1')).toHaveText('Every block');
  await expect(browser.locator('.doc details[open] > summary')).toHaveText('Open toggle');
  expect(await axeViolations(browser, 'all', 'main')).toEqual([]);
});
