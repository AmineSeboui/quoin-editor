import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { docsDir, readText, root, sectionOf } from './docs-sources.mjs';

const SOURCE = /\.(css|tsx?)$/;
const SKIPPED = /\.test\.tsx?$|\.d\.ts$/;
const SECTION = '## Names the editor sets itself';

const page = readText(join(docsDir, 'theming.md'));
const hostDefaults = readFileSync(join(root, 'src/ui/tokens.css'), 'utf8');

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return SOURCE.test(entry.name) && !SKIPPED.test(path) ? [path] : [];
  });

// A name built in a template literal, `--quoin-color-${tone}`, matches up to the interpolation and is not a name.
const namesIn = (text: string) => [...text.matchAll(/--quoin-[a-z0-9-]+/g)].map(([name]) => name).filter((name) => !name.endsWith('-'));

const declaredIn = (text: string) => [...text.matchAll(/(--quoin-[a-z0-9-]+)\s*:/g)].map(([, name]) => name);

const rowNames = (markdown: string) => [...markdown.matchAll(/^\| `(--quoin-[a-z0-9-]+)` \|/gm)].map(([, name]) => name);

const unique = (names: string[]) => [...new Set(names)].sort();

const hostTokens = new Set(declaredIn(hostDefaults));
const used = unique(sources(join(root, 'src')).flatMap((file) => namesIn(readFileSync(file, 'utf8'))));
const editorSet = used.filter((name) => !hostTokens.has(name));
const styleSheets = sources(join(root, 'src')).filter((file) => file.endsWith('.css'));

describe('the theming page', () => {
  it('names every prefixed property the package sets itself', () => {
    expect(unique(rowNames(sectionOf(page, SECTION)))).toEqual(editorSet);
  });

  it('leaves those names out of the block it tells a host to write', () => {
    const mapping = /```css\n\.quoin \{\n([\s\S]*?)```/.exec(page)?.[1] ?? '';
    expect(mapping).not.toBe('');
    expect(declaredIn(mapping).filter((name) => !hostTokens.has(name))).toEqual([]);
  });

  it('warns about the only one a host rule can beat', () => {
    const fromRules = unique(styleSheets.flatMap((file) => declaredIn(readFileSync(file, 'utf8'))));
    expect(fromRules.filter((name) => !hostTokens.has(name))).toEqual(['--quoin-comments-room']);
    expect(sectionOf(page, SECTION)).toContain('unlayered');
  });
});
