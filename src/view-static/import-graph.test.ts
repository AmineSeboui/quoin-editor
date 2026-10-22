// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const src = resolve(__dirname, '..');
const RUNTIME_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/gm;
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

const withoutComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function resolveImport(from: string, specifier: string): string {
  const base = resolve(dirname(from), specifier);
  const found = EXTENSIONS.map((extension) => base + extension).find((path) => existsSync(path));
  if (!found) throw new Error(`${specifier} from ${from} does not resolve`);
  return found;
}

function importGraph(entry: string): { files: string[]; packages: Set<string> } {
  const files = new Set([entry]);
  const packages = new Set<string>();
  for (const file of files) {
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(RUNTIME_IMPORT)) {
      if (specifier.startsWith('.')) files.add(resolveImport(file, specifier));
      else packages.add(specifier);
    }
  }
  return { files: [...files], packages };
}

const { files, packages } = importGraph(resolve(src, 'view-static', 'index.ts'));
const named = (paths: string[]) => paths.map((path) => relative(src, path));

describe('the view entry import graph', () => {
  it('reaches the engine renderer and nothing of the client', () => {
    expect(named(files)).toEqual(expect.arrayContaining(['engine/render/document-nodes.ts', 'view-static/QuoinView.tsx']));
    expect(named(files).filter((path) => /^(?:view|canvas|menus|hooks|ui|extensions)\/|^index\.ts$/.test(path))).toEqual([]);
  });

  it('loads no package but React', () => {
    expect([...packages]).toEqual(['react']);
  });

  it('reaches no file marked for the client, calling a hook, or reading a browser global', () => {
    const client = files.filter((file) => /^\s*['"]use client['"]/.test(readFileSync(file, 'utf8')));
    const hooks = files.filter((file) => /\buse[A-Z]\w*\s*\(/.test(withoutComments(readFileSync(file, 'utf8'))));
    const browser = files.filter((file) =>
      /(?<![.\w])(?:window|document|navigator|localStorage|sessionStorage)\s*\.|\b(?:matchMedia|requestAnimationFrame|getComputedStyle)\s*\(/.test(
        withoutComments(readFileSync(file, 'utf8')),
      ),
    );
    expect({ client: named(client), hooks: named(hooks), browser: named(browser) }).toEqual({ client: [], hooks: [], browser: [] });
  });
});
