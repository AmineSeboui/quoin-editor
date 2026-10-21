import type { Page } from '@playwright/test';
import { FIXTURE_PNG } from '../app/fixture-png';

// axe scans the frames too, so the page standing in for a provider's is a whole page, its landmark named after it.
const stubPage = (url: string) =>
  `<!doctype html><html lang="en"><title>Stub</title><main aria-label="${encodeURI(url)}"><h1>Stub</h1></main></html>`;

/** Answers every provider, picture and page here, so no test depends on the network or on a frame loading. */
export function answerEveryRequest(page: Page) {
  return page.route(/^https:\/\//, (route) =>
    route.request().url().endsWith('.png')
      ? route.fulfill({ contentType: 'image/png', body: Buffer.from(FIXTURE_PNG.base64, 'base64') })
      : route.fulfill({ contentType: 'text/html', body: stubPage(route.request().url()) }),
  );
}
