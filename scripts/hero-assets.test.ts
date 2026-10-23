// @vitest-environment node
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readGif } from './demo-recording/read-gif.mjs';
import { root } from './docs-sources.mjs';

const GIF = join(root, 'demo/public/quoin-demo.gif');
const OG_PNG = join(root, 'demo/public/og.png');
const OG_HTML = join(root, 'demo/og.html');
const TAGLINE = 'Blocks on screen. Markdown on disk.';
const MB = 1024 * 1024;

const pngHeader = (path: string) => {
  const bytes = readFileSync(path);
  return { signature: bytes.subarray(0, 8).toString('hex'), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};

describe('the hero animation', () => {
  it('is a GIF in the folder the docs site serves, under 3 MB', () => {
    expect(existsSync(GIF)).toBe(true);
    expect(statSync(GIF).size).toBeLessThan(3 * MB);
  });

  it('is 1280 by 720, loops forever and plays for 10 to 40 seconds', () => {
    const gif = readGif(readFileSync(GIF));
    expect(gif.signature).toBe('GIF89a');
    expect({ width: gif.width, height: gif.height }).toEqual({ width: 1280, height: 720 });
    expect(gif.loops).toBe(0);
    const duration = gif.delays.reduce((total, delay) => total + delay, 0);
    expect(duration).toBeGreaterThanOrEqual(10_000);
    expect(duration).toBeLessThanOrEqual(40_000);
  });

  it('holds its last frame for at least two seconds', () => {
    expect(readGif(readFileSync(GIF)).delays.at(-1)).toBeGreaterThanOrEqual(2000);
  });
});

describe('the social preview image', () => {
  it('is a 1280 by 640 PNG under 1 MB', () => {
    expect(pngHeader(OG_PNG)).toEqual({ signature: '89504e470d0a1a0a', width: 1280, height: 640 });
    expect(statSync(OG_PNG).size).toBeLessThan(MB);
  });

  it('is drawn from a page that names Quoin, gives the tagline and shows an editor excerpt', () => {
    const html = readFileSync(OG_HTML, 'utf8');
    expect(html).toContain('<h1>Quoin</h1>');
    expect(html).toContain(TAGLINE);
    expect(html).toContain('data-og-excerpt');
  });

  it('comes from a page the site neither builds nor links', () => {
    const viteConfig = readFileSync(join(root, 'demo/vite.config.ts'), 'utf8');
    const pages = readFileSync(join(root, 'demo/src/site/pages.ts'), 'utf8');
    expect(viteConfig).not.toContain('og.html');
    expect(pages).not.toContain('og.html');
  });
});

describe('the README hero image', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const [, alt, path] = /^!\[([^\]]*)\]\(([^)]+)\)/m.exec(readme) ?? [];

  it('resolves to a file in the repository', () => {
    expect(path).toBe('demo/public/quoin-demo.gif');
    expect(existsSync(join(root, path))).toBe(true);
  });

  it('says in its alt text what the animation shows', () => {
    expect(alt).toMatch(/heading/i);
    expect(alt).toMatch(/slash menu/i);
    expect(alt).toMatch(/drag/i);
  });
});

describe('the recording scripts', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

  it('encode with gifenc pinned exactly as a development dependency', () => {
    expect(manifest.devDependencies.gifenc).toBe('1.0.3');
    expect(manifest.dependencies?.gifenc).toBeUndefined();
  });

  it('run by hand from the root', () => {
    expect(manifest.scripts['record:demo']).toBe('node scripts/record-demo.mjs');
    expect(manifest.scripts['render:og']).toBe('node scripts/render-og.mjs');
  });
});
