import { chromium } from '@playwright/test';

/** Opens a page at a fixed size in the light theme, with every request off this machine refused. */
export async function openPage(viewport) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, colorScheme: 'light', reducedMotion: 'reduce' });
  await context.addInitScript(() => localStorage.setItem('quoin-theme', 'light'));
  await context.route('**/*', (route) => {
    const { protocol, hostname } = new URL(route.request().url());
    return protocol === 'file:' || hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  return { page: await context.newPage(), close: () => browser.close() };
}
