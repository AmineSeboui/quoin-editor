import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const docs = fileURLToPath(new URL('../docs', import.meta.url));

/** Every page of the site, by its path under the base, with whether it holds a live editor. */
export const sitePages: { path: string; live: boolean }[] = [
  { path: '', live: true },
  ...readdirSync(docs)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => ({ path: `docs/${name.slice(0, -'.md'.length)}/`, live: false })),
  { path: 'blocks/', live: true },
  { path: 'collaboration/', live: true },
  { path: 'ai/', live: true },
  { path: 'comments/', live: true },
  { path: 'server-rendering/', live: false },
  { path: 'comparison/', live: false },
  { path: 'migration/', live: false },
  { path: 'changelog/', live: false },
];
