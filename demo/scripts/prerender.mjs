import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const serverBuild = join(root, 'dist-server');
const { fillTemplate, notFoundPage, pages, renderPage, robots, searchRecords, sitemap } = await import(
  join(serverBuild, 'entry.js')
);

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};

const index = [];
for (const page of pages) {
  const rendered = renderPage(page);
  write(join(dist, page.path, 'index.html'), fillTemplate(template, rendered));
  index.push(...searchRecords(page, rendered.body));
}

write(join(dist, '404.html'), fillTemplate(template, renderPage(notFoundPage)));
write(join(dist, 'search-index.json'), JSON.stringify(index));
write(join(dist, 'sitemap.xml'), sitemap(pages));
write(join(dist, 'robots.txt'), robots());
rmSync(serverBuild, { recursive: true, force: true });
console.log(`prerendered ${pages.length} pages and 404.html, indexed ${index.length} sections`);
