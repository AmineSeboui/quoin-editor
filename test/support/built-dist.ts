import { existsSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '..', '..');
export const dist = resolve(root, 'dist');

const leaves = (value: unknown): string[] => {
  if (typeof value === 'string') return [value];
  return typeof value === 'object' && value !== null ? Object.values(value).flatMap(leaves) : [];
};

export const distEntries: string[] = leaves(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).exports)
  .filter((file) => file.startsWith('./dist/'))
  .map((file) => file.slice('./dist/'.length));

type Plan = { action: 'run' } | { action: 'skip' } | { action: 'fail'; missing: string[] };
type PlanOptions = { dir?: string; entries?: readonly string[]; env?: Readonly<Record<string, string | undefined>> };

const isSet = (value: string | undefined) => value !== undefined && value !== '' && value !== 'false' && value !== '0';

/** Decides what a suite that needs built files does: run, skip on a developer machine, or fail where CI is set. */
export function builtDistAction(files: readonly string[], options: PlanOptions = {}): Plan {
  const dir = options.dir ?? dist;
  const missingFrom = (names: readonly string[]) => names.filter((name) => !existsSync(resolve(dir, name)));
  if (isSet((options.env ?? process.env).CI)) {
    const missing = missingFrom([...new Set([...files, ...(options.entries ?? distEntries)])]);
    return missing.length === 0 ? { action: 'run' } : { action: 'fail', missing };
  }
  return missingFrom(files).length === 0 ? { action: 'run' } : { action: 'skip' };
}

export function describeBuilt(name: string, files: readonly string[], body: () => void): void {
  const plan = builtDistAction(files);
  if (plan.action === 'run') describe(name, body);
  else if (plan.action === 'skip') describe.skip(name, body);
  else {
    describe(name, () => {
      it('finds every built entry', () => expect(plan.missing, 'run npm run build before the tests').toEqual([]));
    });
  }
}

/** The built files an entry loads, itself first, following its static imports of other chunks. */
export function reachedChunks(entry: string): string[] {
  const files = new Set([entry]);
  for (const file of files) {
    for (const [, path] of readFileSync(resolve(dist, file), 'utf8').matchAll(/(?:from|import)\s*["']\.\/([^"']+)["']/g)) {
      files.add(path);
    }
  }
  return [...files];
}

/** The modules of src that wrote the code of built files, as their sourcemaps name them, relative to the package root. */
export const mappedSources = (files: readonly string[]): string[] =>
  files.flatMap((file) =>
    (JSON.parse(readFileSync(resolve(dist, `${file}.map`), 'utf8')).sources as string[]).map((source) =>
      relative(root, resolve(dist, source)),
    ),
  );

/** Whether code imports a module whose name starts with `name`, in either quote style. */
export const importsFrom = (code: string, name: string): boolean =>
  new RegExp(`(?:from|import)\\s*["']${name}`).test(code);
