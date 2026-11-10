import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const serverBuild = join(root, 'dist-server');
const { fillTemplate, movedHtml, notFoundPage, pages, renderPage, robots, searchRecords, sitemap } = await import(
  join(serverBuild, 'entry.js')
);

const template = readFileSync(join(dist, 'index.html'), 'utf8');
const write = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
};

const index = [];
let moved = 0;
for (const page of pages) {
  // The documentation is served from quoincloud.com now. These addresses stay, as pages that say where they
  // went and take the reader there, so no link anybody wrote over the years lands on nothing.
  if (page.kind === 'doc') {
    write(join(dist, page.path, 'index.html'), movedHtml(page.title, page.slug));
    moved += 1;
    continue;
  }
  const rendered = renderPage(page);
  write(join(dist, page.path, 'index.html'), fillTemplate(template, rendered));
  index.push(...searchRecords(page, rendered.body));
}

write(join(dist, '404.html'), fillTemplate(template, renderPage(notFoundPage)));
write(join(dist, 'search-index.json'), JSON.stringify(index));
write(join(dist, 'sitemap.xml'), sitemap(pages));
write(join(dist, 'robots.txt'), robots());
rmSync(serverBuild, { recursive: true, force: true });
console.log(`prerendered ${pages.length - moved} pages, ${moved} moved notices and 404.html, indexed ${index.length} sections`);
