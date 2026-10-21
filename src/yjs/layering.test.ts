// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const src = resolve(__dirname, '..');
const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === 'test-support' ? [] : sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
const importsOf = (path: string) =>
  [...readFileSync(path, 'utf8').matchAll(/(?:from|import)\s*['"]([^'"]+)['"]/g)].map(([, from]) => from);

// Presence imports the adapter; the adapter must never reach presence, the view or React, so a worker or a server
// that loads it pays for none of the canvas.
describe('the Yjs adapter', () => {
  it('imports nothing of presence, the view, the canvas or React', () => {
    const files = [join(src, 'yjs.ts'), ...sources(join(src, 'yjs'))];
    expect(files.length).toBeGreaterThan(20);
    const reached = files.flatMap((file) =>
      importsOf(file)
        .filter((from) => /extensions|presence|view|canvas|^react/.test(from))
        .map((from) => `${file.slice(src.length)}: ${from}`),
    );
    expect(reached).toEqual([]);
  });
});
