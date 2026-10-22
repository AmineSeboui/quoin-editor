// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { describeBuilt, dist } from '../../test/support/built-dist';

const RENDER = `
  const { createElement } = await import('react');
  const { renderToString } = await import('react-dom/server');
  const { QuoinView } = await import(process.env.QUOIN_VIEW);
  const { toHTML } = await import(process.env.QUOIN_ENGINE);
  if (typeof window !== 'undefined' || typeof document !== 'undefined') throw new Error('this process has a DOM');
  const blocks = [
    { id: 'h', type: 'MARKDOWN', data: { markdown: '# Title' } },
    { id: 'c', type: 'CALLOUT', data: { tone: 'info', body: 'Read **this**' } },
  ];
  process.stdout.write(JSON.stringify({ view: renderToString(createElement(QuoinView, { blocks })), html: toHTML(blocks) }));`;

function reachedChunks(entry: string): string[] {
  const files = new Set([entry]);
  for (const file of files) {
    for (const [, chunk] of readFileSync(resolve(dist, file), 'utf8').matchAll(/from\s*"\.\/([^"]+)"|import\s*"\.\/([^"]+)"/g)) {
      files.add(chunk);
    }
  }
  return [...files];
}

describeBuilt('the built view entry', ['view.js', 'engine.js'], () => {
  it('renders a document in Node without a DOM, as toHTML writes it', () => {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', RENDER], {
      encoding: 'utf8',
      cwd: resolve(__dirname, '..', '..'),
      env: {
        ...process.env,
        QUOIN_VIEW: pathToFileURL(resolve(dist, 'view.js')).href,
        QUOIN_ENGINE: pathToFileURL(resolve(dist, 'engine.js')).href,
      },
    });
    const { view, html } = JSON.parse(output);
    expect(view).toBe(`<div>${html}</div>`);
  });

  it('loads no module of the canvas, the client view or React DOM', () => {
    const code = reachedChunks('view.js').map((file) => readFileSync(resolve(dist, file), 'utf8'));
    const sources = code.flatMap((text) => [...text.matchAll(/^\/\/ (src\/\S+)$/gm)].map(([, path]) => path));
    expect(sources).toContain('src/view-static/QuoinView.tsx');
    expect(sources.filter((path) => /^src\/(?:view|canvas|menus|hooks|ui|extensions)\/|^src\/index\.ts$/.test(path))).toEqual([]);
    expect(code.filter((text) => /from\s*"react-dom|['"]use client['"]/.test(text))).toEqual([]);
  });
});
