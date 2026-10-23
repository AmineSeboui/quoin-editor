import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const serverBuild = join(root, 'dist-server');
const { fillTemplate, pages, renderPage, robots, sitemap } = await import(join(serverBuild, 'entry.js'));

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};

for (const page of pages) write(join(dist, page.path, 'index.html'), fillTemplate(template, renderPage(page)));
write(join(dist, 'sitemap.xml'), sitemap(pages));
write(join(dist, 'robots.txt'), robots());
rmSync(serverBuild, { recursive: true, force: true });
console.log(`prerendered ${pages.length} pages into ${dist}`);
