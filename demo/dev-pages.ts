import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import type * as Entry from './src/server/entry.tsx';

/** Serves each page in development as the build prerenders it, so `vite` shows the same HTML. */
export function devPages(base: string): Plugin {
  return {
    name: 'quoin-site-dev-pages',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const path = (request.url ?? '').split(/[?#]/)[0];
        if (!path.startsWith(base) || !(path.endsWith('/') || path === base.slice(0, -1))) return next();
        try {
          const entry = (await server.ssrLoadModule('/src/server/entry.tsx')) as typeof Entry;
          const page = entry.pages.find((candidate) => base + candidate.path === path);
          if (!page) return next();
          const template = await server.transformIndexHtml(path, readFileSync(resolve(server.config.root, 'index.html'), 'utf8'));
          response.setHeader('Content-Type', 'text/html');
          response.end(entry.fillTemplate(template, entry.renderPage(page)));
        } catch (error) {
          next(error);
        }
      });
    },
  };
}
