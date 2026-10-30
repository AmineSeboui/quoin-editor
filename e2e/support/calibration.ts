import type { Page } from '@playwright/test';

export const BASELINE_MS = 3.1;

export function calibrationMs(page: Page): Promise<number> {
  return page.evaluate(() => {
    const runs: number[] = [];
    for (let run = 0; run < 7; run++) {
      const start = performance.now();
      const container = document.createElement('div');
      for (let i = 0; i < 2000; i++) {
        const node = document.createElement('div');
        node.textContent = `calibration ${i}`;
        container.append(node);
      }
      document.body.append(container);
      void container.offsetHeight;
      container.remove();
      runs.push(performance.now() - start);
    }
    return runs.sort((a, b) => a - b)[3];
  });
}
