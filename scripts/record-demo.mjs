import { existsSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { authoringSession, emptyDocument } from './demo-recording/authoring-session.mjs';
import { encodeGif } from './demo-recording/encode-gif.mjs';
import { openPage } from './demo-recording/open-page.mjs';
import { pngPixels } from './demo-recording/png-pixels.mjs';
import { prepareRecordingView } from './demo-recording/recording-view.mjs';
import { serveDist } from './demo-recording/serve-dist.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'demo/dist');
const output = join(root, 'demo/public/quoin-demo.gif');
const settle = async () => {
  const frame = () => new Promise((done) => requestAnimationFrame(() => done()));
  await frame();
  await frame();
  await Promise.all(
    document.getAnimations().map((animation) => (animation.effect?.getTiming().iterations === Infinity ? null : animation.finished)),
  );
};
const VIEWPORT = { width: 1280, height: 720 };

if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('Build the package and the site first: npm run build, then npm ci and npm run build in demo/.');
}

const site = await serveDist(dist, '/quoin-editor/');
const { page, close } = await openPage(VIEWPORT);
const shots = [];
try {
  await page.goto(site.url);
  await page.locator('[data-island] [data-quoin-host]').first().waitFor();
  await emptyDocument(page);
  await prepareRecordingView(page);
  await page.evaluate(() => document.fonts.ready);
  await authoringSession(page, {
    hold: async (delay) => {
      await page.evaluate(settle);
      shots.push({ png: await page.screenshot({ animations: 'disabled' }), delay });
    },
  });
} finally {
  await close();
  await site.close();
}

const frames = shots.map(({ png, delay }) => ({ rgba: pngPixels(png).rgba, delay }));
const gif = encodeGif(frames, VIEWPORT.width, VIEWPORT.height);
writeFileSync(output, gif.bytes);
const size = statSync(output).size;
console.log(`${output}: ${gif.frames} frames from ${shots.length} captures, ${(gif.duration / 1000).toFixed(1)} s, ${size} bytes`);
