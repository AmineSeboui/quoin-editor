import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

const src = resolve(__dirname, '..', '..', 'src');
const RUNTIME_IMPORT = /^\s*(?:import|export)\s+(?!type\b)(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]/gm;
const EXTENSIONS = ['.ts', '.tsx', '/index.ts', '/index.tsx'];
const BROWSER_GLOBAL =
  /(?<![.\w])(?:window|document|navigator|localStorage|sessionStorage)\s*\.|\b(?:matchMedia|requestAnimationFrame|getComputedStyle)\s*\(/;

const withoutComments = (code: string) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

function resolveImport(from: string, specifier: string): string {
  const base = resolve(dirname(from), specifier);
  const found = EXTENSIONS.map((extension) => base + extension).find((path) => existsSync(path));
  if (!found) throw new Error(`${specifier} from ${from} does not resolve`);
  return found;
}

/** The source files an entry under `src` reaches through runtime imports, relative to `src`, and the packages it loads. */
export function importGraph(entry: string): { files: string[]; packages: Set<string> } {
  const files = new Set([resolve(src, entry)]);
  const packages = new Set<string>();
  for (const file of files) {
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(RUNTIME_IMPORT)) {
      if (specifier.startsWith('.')) files.add(resolveImport(file, specifier));
      else packages.add(specifier);
    }
  }
  return { files: [...files].map((file) => relative(src, file)), packages };
}

/** The files among `files` marked for the client, calling a hook, or reading a browser global. */
export function clientOnlyFiles(files: readonly string[]): { client: string[]; hooks: string[]; browser: string[] } {
  const code = (file: string) => readFileSync(resolve(src, file), 'utf8');
  return {
    client: files.filter((file) => /^\s*['"]use client['"]/.test(code(file))),
    hooks: files.filter((file) => /\buse[A-Z]\w*\s*\(/.test(withoutComments(code(file)))),
    browser: files.filter((file) => BROWSER_GLOBAL.test(withoutComments(code(file)))),
  };
}

/** A path of the canvas, the client view or the main entry, none of which a server entry may reach. */
export const CLIENT_PATH = /^(?:view|canvas|menus|hooks|ui|extensions)\/|^index\.ts$/;
