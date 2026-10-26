import { expect, test } from '@playwright/test';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { BlockCanvas, type CodeHighlighter } from '../../../src';

const colours = ['red;background-image:url(https://t.example/x.png)', '#0a0B0c', 'var(--token)', 'rgb(1 2 3 / 50%)'];
const highlight: CodeHighlighter = (code) => [[...code].map((text, at) => ({ text, color: colours[at] }))];

test('a code block rendered on the server draws a token colour only when it is one colour value', async ({ page }) => {
  const fetched: string[] = [];
  await page.route('https://t.example/**', (route) => {
    fetched.push(route.request().url());
    return route.fulfill({ status: 204 });
  });
  const blocks = [{ id: 'c', type: 'CODE', data: { language: '', code: 'abcd' } }];
  const html = renderToString(createElement(BlockCanvas, { blocks, onChange: () => {}, highlight }));
  await page.goto('/');
  await page.setContent(`<!doctype html><html lang="en"><body>${html}</body></html>`);
  const tokens = page.locator('.quoin-code-text span');
  await expect(tokens).toHaveCount(4);
  const drawn = await tokens.evaluateAll((spans) => spans.map((span) => [span.getAttribute('style'), getComputedStyle(span).backgroundImage]));
  expect(drawn).toEqual([
    [null, 'none'],
    ['color:#0a0B0c', 'none'],
    ['color:var(--token)', 'none'],
    ['color:rgb(1 2 3 / 50%)', 'none'],
  ]);
  expect(fetched).toEqual([]);
});
