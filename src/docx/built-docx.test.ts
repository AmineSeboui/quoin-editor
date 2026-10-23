// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { describeBuilt, dist, reachedChunks } from '../../test/support/built-dist';

const EXPORT = `
  const { toDocx } = await import(process.env.QUOIN_DOCX);
  if (typeof window !== 'undefined' || typeof document !== 'undefined') throw new Error('this process has a DOM');
  const blob = await toDocx([
    { id: 'h', type: 'MARKDOWN', data: { markdown: '# Title' } },
    { id: 'l', type: 'MARKDOWN', data: { markdown: '- [Quoin](https://quoin.dev) **bold**' } },
  ], { title: 'Built' });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  process.stdout.write(JSON.stringify({ type: blob.type, size: blob.size, head: [...bytes.subarray(0, 2)] }));`;

describeBuilt('the built docx entry', ['docx.js', 'docx.cjs'], () => {
  it('exports a document in Node without a DOM', () => {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', EXPORT], {
      encoding: 'utf8',
      env: { ...process.env, QUOIN_DOCX: pathToFileURL(resolve(dist, 'docx.js')).href },
    });
    const { type, size, head } = JSON.parse(output);
    expect(type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(size).toBeGreaterThan(1000);
    expect(String.fromCharCode(...head)).toBe('PK');
  });

  it('loads no module of React, the canvas or the views, and carries no directive', () => {
    const code = reachedChunks('docx.js').map((file) => readFileSync(resolve(dist, file), 'utf8'));
    const sources = code.flatMap((text) => [...text.matchAll(/^\/\/ (src\/\S+)$/gm)].map(([, path]) => path));
    expect(sources).toContain('src/docx/index.ts');
    expect(sources.filter((path) => /^src\/(?:view|view-static|diff|canvas|menus|hooks|ui|extensions)\/|^src\/index\.ts$/.test(path))).toEqual([]);
    expect(code.filter((text) => /from\s*"react|['"]use client['"]/.test(text))).toEqual([]);
  });
});
