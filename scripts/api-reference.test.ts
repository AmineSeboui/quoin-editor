// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { describeBuilt } from '../test/support/built-dist';
import { referenceFile, referenceMarkdown } from './api-reference.mjs';
import { readEntries } from './api-surface.mjs';
import { readText, REFERENCE_SLUGS, root } from './docs-sources.mjs';

const generated: Map<string, string> = referenceMarkdown();
const [ENGINE, HEADLESS] = REFERENCE_SLUGS as [string, string];

const page = (slug: string) => generated.get(slug) ?? '';
const listed = (slug: string) => [...page(slug).matchAll(/^### (.+)$/gm)].map(([, name]) => name).sort();
const matches = (slug: string, pattern: RegExp) => [...page(slug).matchAll(pattern)].length;

describe('the generated reference', () => {
  it.each(REFERENCE_SLUGS)('writes %s as the docs source on disk holds it', (slug) => {
    expect(readText(referenceFile(slug))).toBe(page(slug));
  });

  it.each(REFERENCE_SLUGS)('gives every export of %s a signature and the line that declares it', (slug) => {
    const names = listed(slug);
    expect(names.length).toBeGreaterThan(20);
    expect(matches(slug, /^```ts$/gm)).toBe(names.length);
    expect(matches(slug, / on GitHub\]\((?:src\/[\w./-]+\.tsx?)#L\d+\)$/gm)).toBe(names.length);
  });

  it.each(REFERENCE_SLUGS)('writes the types of %s as a host reads them, not through the files they came by', (slug) => {
    expect(page(slug)).not.toContain('import("');
  });

  it('lists what the headless entry adds to the engine, and nothing the engine already has', () => {
    const shared = listed(HEADLESS).filter((name) => listed(ENGINE).includes(name));
    expect(shared).toEqual([]);
  });
});

describeBuilt('the generated reference and the built types', ['engine.d.ts', 'headless.d.ts'], () => {
  const built = readEntries(root, [
    { name: 'engine', source: 'dist/engine.d.ts' },
    { name: 'headless', source: 'dist/headless.d.ts' },
  ]);
  const exported = (name: string) =>
    (built.get(name) ?? []).map(({ name: exportName }: { name: string }) => exportName).sort();

  it('list the same names for the engine', () => expect(listed(ENGINE)).toEqual(exported('engine')));

  it('list the same names for the headless entry', () =>
    expect([...listed(ENGINE), ...listed(HEADLESS)].sort()).toEqual(exported('headless')));
});
