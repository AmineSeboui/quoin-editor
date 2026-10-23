// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { describeBuilt, distEntries } from '../test/support/built-dist';
import { readText, root, sectionOf } from './docs-sources.mjs';

type Packed = { size: number; unpackedSize: number; files: { path: string }[] };

const DOCUMENTS = ['package.json', 'README.md', 'LICENSE', 'CHANGELOG.md', 'MIGRATION.md'];
const STATED = 'about 1 MB packed, under 5 MB unpacked';
const ABOUT_1_MB = { min: 850_000, max: 1_150_000 };
const UNDER_5_MB = 5_000_000;

let packed: Packed | undefined;
const pack = (): Packed =>
  (packed ??= JSON.parse(
    execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' }),
  )[0]);

describeBuilt('the packed tarball', distEntries, () => {
  it('holds the build and the documents only', () => {
    const paths = pack().files.map(({ path }) => path);
    expect(paths.filter((path) => !DOCUMENTS.includes(path) && !path.startsWith('dist/'))).toEqual([]);
    expect(DOCUMENTS.filter((path) => !paths.includes(path))).toEqual([]);
  }, 30_000);

  it('has the size the README and the changelog state', () => {
    const { size, unpackedSize } = pack();
    expect(size).toBeGreaterThanOrEqual(ABOUT_1_MB.min);
    expect(size).toBeLessThan(ABOUT_1_MB.max);
    expect(unpackedSize).toBeLessThan(UNDER_5_MB);
    expect(readText(join(root, 'README.md'))).toContain(STATED);
    expect(readText(join(root, 'demo', 'docs', 'getting-started.md'))).toContain(STATED);
    expect(sectionOf(sectionOf(readText(join(root, 'CHANGELOG.md')), '## 1.0.0 (unreleased)'), '### Changed')).toContain(STATED);
  }, 30_000);
});
