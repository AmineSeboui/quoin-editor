import { statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openPage } from './demo-recording/open-page.mjs';

const root = resolve(import.meta.dirname, '..');
const output = join(root, 'demo/public/og.png');

const { page, close } = await openPage({ width: 1280, height: 640 });
try {
  await page.goto(pathToFileURL(join(root, 'demo/og.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: output, animations: 'disabled' });
} finally {
  await close();
}
console.log(`${output}: ${statSync(output).size} bytes`);
