// @vitest-environment node
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readText, root, sectionOf } from './docs-sources.mjs';
import { specifier } from './entry-outputs.mjs';
import { packageEntries } from './package-entries.mjs';

const changelog = readText(join(root, 'CHANGELOG.md'));
const release = sectionOf(changelog, '## 1.0.0 (unreleased)');
const part = (name: string) => sectionOf(release, `### ${name}`);
const entryNamed = (text: string, name: string) => new RegExp(`\`${name}\`(?![/\\w-])`).test(text);

describe('the changelog', () => {
  it('has a 1.0.0 section above every 0.x release', () => {
    const versions = [...changelog.matchAll(/^## (\d+\.\d+\.\d+)/gm)].map(([, version]) => version);
    expect(versions[0]).toBe('1.0.0');
    expect(versions).toEqual(['1.0.0', '0.4.2', '0.4.1', '0.4.0', '0.3.0', '0.2.0', '0.1.1', '0.1.0']);
  });

  it('sorts the 1.0.0 changes under Added, Changed, Removed, Fixed and Security', () => {
    const headings = [...release.matchAll(/^### (.+)$/gm)].map(([, heading]) => heading);
    expect(headings).toEqual(['Added', 'Changed', 'Removed', 'Fixed', 'Security']);
  });

  it.each(packageEntries.map((entry) => [specifier(entry)]))('names the %s entry under Added', (name) => {
    expect(entryNamed(part('Added'), name)).toBe(true);
  });

  it.each(['useBlockList', 'useAutoGrow', 'useMarkdownKeymap', 'TEXT_COMMANDS', '@dnd-kit', 'cmdk', 'tailwind-merge', 'class-variance-authority'])(
    'lists %s under Removed',
    (name) => {
      expect(part('Removed')).toContain(`\`${name}`);
    },
  );

  it('gives each review finding it lists as fixed once, by its id', () => {
    const ids = [...part('Fixed').matchAll(/\bF-\d{2}\b/g)].map(([id]) => id);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('names the link rule of the Word export and the colour rule of the highlighter under Security', () => {
    expect(part('Security')).toMatch(/toDocx/);
    expect(part('Security')).toMatch(/mailto/);
    expect(part('Security')).toMatch(/highlight/);
  });
});
