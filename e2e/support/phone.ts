import { devices, test as base } from '@playwright/test';

const phone = (browserName: string) => (browserName === 'webkit' ? devices['iPhone 14'] : devices['Pixel 7']);

// A page in a phone's context: a coarse pointer, touch and a small screen. Firefox cannot emulate a mobile device.
export const phoneTest = base.extend({
  page: async ({ browser, browserName, baseURL }, provide) => {
    const context = await browser.newContext({ ...phone(browserName), baseURL });
    await provide(await context.newPage());
    await context.close();
  },
});
