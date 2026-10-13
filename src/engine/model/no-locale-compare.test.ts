import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const engine = join(__dirname, '..');
const banned = /localeCompare|Intl\.Collator|toLocaleLowerCase|toLocaleUpperCase/;

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('engine sources', () => {
  it('never use locale dependent comparison or case mapping', () => {
    const offenders = sources(engine)
      .filter((file) => banned.test(readFileSync(file, 'utf8')))
      .map((file) => relative(engine, file));
    expect(offenders, `locale dependent calls in: ${offenders.join(', ')}`).toEqual([]);
  });
});
