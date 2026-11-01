import { writeFileSync } from 'node:fs';
import { encodeGif } from './encode-gif.mjs';
import { openPage } from './open-page.mjs';
import { pngPixels } from './png-pixels.mjs';
import { prepareRecordingView } from './recording-view.mjs';

export const VIEWPORT = { width: 1280, height: 720 };

// The home page's markdown panel redraws once typing pauses for 300 ms; a longer hold is filmed again after that.
const PANEL_PAUSE = 300;

const settle = async () => {
  const frame = () => new Promise((done) => requestAnimationFrame(() => done()));
  await frame();
  await frame();
  await Promise.all(
    document.getAnimations().map((animation) => (animation.effect?.getTiming().iterations === Infinity ? null : animation.finished)),
  );
};

const capture = async (page) => {
  await page.evaluate(settle);
  return page.screenshot({ animations: 'disabled' });
};

/** Films one clip on the served site and writes it to `output` as a looping GIF. */
export async function recordClip(siteUrl, clip, output) {
  const { page, close } = await openPage(VIEWPORT);
  const shots = [];
  try {
    await page.goto(`${siteUrl}${clip.path}`);
    await page.locator('[data-island] [data-quoin-host]').first().waitFor();
    await clip.prepare(page);
    await page.waitForTimeout(PANEL_PAUSE + 100);
    await prepareRecordingView(page, clip.css);
    await page.evaluate(() => document.fonts.ready);
    await clip.session(page, {
      hold: async (delay) => {
        shots.push({ png: await capture(page), delay: Math.min(delay, PANEL_PAUSE) });
        if (delay < PANEL_PAUSE) return;
        await page.waitForTimeout(PANEL_PAUSE + 100);
        if (delay > PANEL_PAUSE) shots.push({ png: await capture(page), delay: delay - PANEL_PAUSE });
      },
    });
  } finally {
    await close();
  }
  const frames = shots.map(({ png, delay }) => ({ rgba: pngPixels(png).rgba, delay }));
  const gif = encodeGif(frames, VIEWPORT.width, VIEWPORT.height);
  writeFileSync(output, gif.bytes);
  return { ...gif, captures: shots.length };
}
