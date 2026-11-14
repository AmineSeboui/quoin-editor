// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { describeBuilt, dist, importsFrom, mappedSources, reachedChunks } from '../../test/support/built-dist';

const EXPORT = `
  const { toPdf } = await import(process.env.QUOIN_PDF);
  if (typeof window !== 'undefined' || typeof document !== 'undefined') throw new Error('this process has a DOM');
  const blob = await toPdf([
    { id: 'h', type: 'MARKDOWN', data: { markdown: '# Title' } },
    { id: 'l', type: 'MARKDOWN', data: { markdown: '- [Quoin](https://quoin.dev) **bold**' } },
  ], { title: 'Built' });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  process.stdout.write(JSON.stringify({ type: blob.type, size: blob.size, head: [...bytes.subarray(0, 8)] }));`;

describeBuilt('the built pdf entry', ['pdf.js', 'pdf.cjs'], () => {
  it('exports a document in Node without a DOM', () => {
    const output = execFileSync(process.execPath, ['--input-type=module', '-e', EXPORT], {
      encoding: 'utf8',
      env: { ...process.env, QUOIN_PDF: pathToFileURL(resolve(dist, 'pdf.js')).href },
    });
    const { type, size, head } = JSON.parse(output);
    expect(type).toBe('application/pdf');
    expect(size).toBeGreaterThan(1000);
    expect(String.fromCharCode(...head)).toBe('%PDF-1.7');
  });

  it('loads no module of React, the canvas, the views or the Word export, and carries no directive', () => {
    const chunks = reachedChunks('pdf.js');
    const code = chunks.map((file) => readFileSync(resolve(dist, file), 'utf8'));
    const sources = mappedSources(chunks);
    expect(sources).toContain('src/pdf/index.ts');
    expect(sources.filter((path) => /^src\/(?:view|view-static|diff|docx|canvas|menus|hooks|ui|extensions)\/|^src\/index\.ts$/.test(path))).toEqual([]);
    expect(code.filter((text) => importsFrom(text, 'react') || /['"]use client['"]/.test(text))).toEqual([]);
  });
});
