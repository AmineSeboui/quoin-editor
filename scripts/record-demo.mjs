import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { clips } from './demo-recording/clips.mjs';
import { recordClip } from './demo-recording/record-clip.mjs';
import { serveDist } from './demo-recording/serve-dist.mjs';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'demo/dist');
const wanted = process.argv.slice(2);
const unknown = wanted.filter((name) => !clips.some((clip) => clip.name === name));

if (unknown.length > 0) {
  throw new Error(`No clip named ${unknown.join(', ')}. The clips are ${clips.map((clip) => clip.name).join(', ')}.`);
}
if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('Build the package and the site first: npm run build, then npm ci and npm run build in demo/.');
}

const site = await serveDist(dist, '/quoin-editor/');
try {
  for (const clip of clips.filter(({ name }) => wanted.length === 0 || wanted.includes(name))) {
    const output = join(root, 'demo/public', clip.file);
    const gif = await recordClip(site.url, clip, output);
    const size = statSync(output).size;
    console.log(`${output}: ${gif.frames} frames from ${gif.captures} captures, ${(gif.duration / 1000).toFixed(1)} s, ${size} bytes`);
  }
} finally {
  await site.close();
}
