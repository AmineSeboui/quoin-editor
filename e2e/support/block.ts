import type { Page } from '@playwright/test';

export const shell = (page: Page, id: string) => page.locator(`[data-block-id="${id}"]`);

// Every renderer draws one editable region, so this names exactly one element, and a block that holds several makes it
// ambiguous rather than picking one: a table draws a region per cell, and a spec reaching for `host` on one means a
// cell it has not named. Take `.first()` at the call site where any block type is acceptable.
export const host = (page: Page, id: string) => shell(page, id).locator('[data-quoin-host]');

// The 'empty' document is one block whose id the harness generates, so a spec on it has no id to address.
export const onlyHost = (page: Page) => page.locator('[data-quoin-host]').first();

export const firstLine = (page: Page, id: string) =>
  host(page, id).evaluate((element) => {
    const { top, left, width } = element.getBoundingClientRect();
    return { top, left, width, height: parseFloat(getComputedStyle(element).lineHeight) };
  });
