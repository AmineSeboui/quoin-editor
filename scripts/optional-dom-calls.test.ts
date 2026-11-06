// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { root } from './docs-sources.mjs';

const src = join(root, 'src');

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// A webview or a test environment may ship an element without these, and losing the nicety they give should
// never take the host's tree down with a TypeError.
const OPTIONAL_METHODS = ['scrollIntoView', 'scrollTo'];

describe.each(OPTIONAL_METHODS)('every %s call the library makes', (method) => {
  it('guards the method, not only the element', () => {
    const unguarded = sources(src).flatMap((path) => {
      const text = readFileSync(path, 'utf8');
      const lines = text.split('\n');
      return lines.flatMap((line, index) =>
        line.includes(`.${method}(`) ? [`${relative(root, path)}:${index + 1}`] : [],
      );
    });
    expect(unguarded).toEqual([]);
  });
});
