import type { Locator } from '@playwright/test';

/** Waits for the entrance animations of a menu or popover to end, so its box is where it stays. */
export const settled = (locator: Locator) =>
  locator.evaluate((element) => Promise.allSettled(element.getAnimations({ subtree: true }).map((animation) => animation.finished)));
