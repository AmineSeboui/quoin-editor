import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
