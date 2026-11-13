import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { sourceFiles } from '../../test/support/source-files';

const src = resolve(__dirname, '..');
const stylesheet = readFileSync(resolve(src, 'styles.css'), 'utf8');

/** The class a list Quoin draws carries to drop its markers, or one its own stylesheet drops them for. */
const UNMARKED = /\b(?:list-none|quoin-toc-list)\b/;

/** Each `<ul>` or `<ol>` the package's own components draw, with the classes written on it. */
const ownLists = Object.entries(sourceFiles())
  .filter(([path]) => path.endsWith('.tsx') && !/\.test\.tsx$|test-support|test-canvas/.test(path))
  .flatMap(([path, code]) =>
    [...code.matchAll(/<(ul|ol)\b([^>]*)>/g)].map(([, tag, attributes]) => ({
      list: `${relative(src, path)} <${tag}>`,
      unmarked: UNMARKED.test(attributes),
    })),
  );

describe('list markers', () => {
  it('are left to a host list inside the canvas, which no base rule strips of its bullets', () => {
    expect(stylesheet).not.toMatch(/\.quoin (?:ul|ol)\b/);
  });

  it('are dropped by each list Quoin draws itself, from a class it carries', () => {
    expect(ownLists.length).toBeGreaterThan(0);
    expect(ownLists.filter(({ unmarked }) => !unmarked).map(({ list }) => list)).toEqual([]);
  });
});
