// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isDated, readText, releaseHeading, root, sectionOf } from './docs-sources.mjs';
import { specifier } from './entry-outputs.mjs';
import { packageEntries } from './package-entries.mjs';

const changelog = readText(join(root, 'CHANGELOG.md'));
const version: string = JSON.parse(readText(join(root, 'package.json'))).version;
const heading = releaseHeading(changelog, '1.0.0');
const release = sectionOf(changelog, heading);
const fitsPackage = (line: string, packageVersion: string) => line !== '' && (packageVersion !== '1.0.0' || isDated(line));
const part = (name: string) => sectionOf(release, `### ${name}`);
const entryNamed = (text: string, name: string) => new RegExp(`\`${name}\`(?![/\\w-])`).test(text);

describe('the 1.0.0 heading', () => {
  it.each([
    ['## 1.0.0 (unreleased)', '0.4.2', true],
    ['## 1.0.0 (2026-10-23)', '0.4.2', true],
    ['## 1.0.0 (2026-10-23)', '1.0.0', true],
    ['## 1.0.0 (unreleased)', '1.0.0', false],
    ['## 1.0.0', '0.4.2', false],
    ['## 1.0.0 (soon)', '0.4.2', false],
  ])('accepts %s with package.json at %s: %s', (line, packageVersion, fits) => {
    expect(fitsPackage(releaseHeading(`# Changelog\n\n${line}\n\ntext\n`, '1.0.0'), packageVersion)).toBe(fits);
  });

  it('reads "(unreleased)" or a date, and a date once package.json is at 1.0.0', () => {
    expect(heading).toMatch(/^## 1\.0\.0 \((unreleased|\d{4}-\d{2}-\d{2})\)$/);
    expect(fitsPackage(heading, version)).toBe(true);
  });
});

const titles = [...changelog.matchAll(/^## (.+)$/gm)].map(([, title]) => title);
const versionHeading = releaseHeading(changelog, version);
const newest = sectionOf(changelog, `## ${titles[0]}`);

describe('the newest section', () => {
  it('is Unreleased above the dated section of the package version, or that dated section', () => {
    expect(isDated(versionHeading)).toBe(true);
    expect(titles.slice(0, 2)).toContain(versionHeading.slice(3));
    expect(titles[0] === 'Unreleased' || titles[0] === versionHeading.slice(3)).toBe(true);
  });

  it.skipIf(titles[0] === heading.slice(3))('sorts its changes under Added, Changed, Removed, Fixed and Known limits, each a list', () => {
    const headings = [...newest.matchAll(/^### (.+)$/gm)].map(([, title]) => title);
    expect(headings.length).toBeGreaterThan(0);
    expect(headings.every((title) => ['Added', 'Changed', 'Removed', 'Fixed', 'Known limits'].includes(title))).toBe(true);
    for (const title of headings) expect(sectionOf(newest, `### ${title}`).trim()).toMatch(/^- /);
  });
});

describe('the changelog', () => {
  it('has a 1.0.0 section above every 0.x release and below every 1.x one', () => {
    const versions = [...changelog.matchAll(/^## (\d+\.\d+\.\d+)/gm)].map(([, version]) => version);
    const at = versions.indexOf('1.0.0');
    expect(versions.slice(0, at).every((later) => later.startsWith('1.'))).toBe(true);
    expect(versions.slice(at)).toEqual(['1.0.0', '0.4.2', '0.4.1', '0.4.0', '0.3.0', '0.2.0', '0.1.1', '0.1.0']);
  });

  // A merge can bring a second Added or Changed into a section beside the one already there, which git resolves
  // without a conflict and a reader then meets as two lists of the same kind. 1.4.0 shipped that way.
  it('gives each release at most one heading of a kind', () => {
    const repeated = titles.flatMap((title) => {
      const headings = [...sectionOf(changelog, `## ${title}`).matchAll(/^### (.+)$/gm)].map(([, name]) => name);
      const twice = [...new Set(headings.filter((name, at) => headings.indexOf(name) !== at))];
      return twice.length === 0 ? [] : [`${title}: ${twice.join(', ')}`];
    });
    expect(repeated).toEqual([]);
  });

  it('sorts the 1.0.0 changes under Added, Changed, Removed, Fixed and Security, then the known gaps', () => {
    const headings = [...release.matchAll(/^### (.+)$/gm)].map(([, heading]) => heading);
    expect(headings).toEqual(['Added', 'Changed', 'Removed', 'Fixed', 'Security', 'Known gaps']);
  });

  // Every Added list, not 1.0.0's alone, since an entry published later is named by the release that introduced it.
  const added = changelog
    .split(/^### /m)
    .filter((section) => section.startsWith('Added'))
    .join('\n');

  it.each(packageEntries.map((entry) => [specifier(entry)]))('names the %s entry under Added', (name) => {
    expect(entryNamed(added, name)).toBe(true);
  });

  it.each(['useBlockList', 'useAutoGrow', 'useMarkdownKeymap', 'TEXT_COMMANDS', '@dnd-kit', 'cmdk', 'tailwind-merge', 'class-variance-authority', '@radix-ui/react-label', '@radix-ui/react-select'])(
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

  it('lists each partly fixed finding once under Known gaps, with what was fixed and what remains, never under Fixed', () => {
    const gaps = part('Known gaps')
      .split('\n')
      .filter((line) => line.startsWith('- F-'));
    expect(gaps.length).toBeGreaterThan(0);
    for (const line of gaps) expect(line).toMatch(/Fixed: [\s\S]+ Remains: /);
    const gapIds = gaps.map((line) => line.slice(2, 6));
    expect(new Set(gapIds).size).toBe(gapIds.length);
    expect(gapIds.filter((id) => part('Fixed').includes(id))).toEqual([]);
    expect(part('Fixed')).not.toMatch(/in part/);
  });

  it.each(['align', 'color', 'background', 'icon', 'url', 'widthPercent', 'mime', 'indent'])(
    'names the optional key %s that 1.0 writes',
    (key) => {
      expect(part('Changed')).toContain(`\`${key}\``);
    },
  );

  it('names the link rule of the Word export and the colour rule of the highlighter under Security', () => {
    expect(part('Security')).toMatch(/toDocx/);
    expect(part('Security')).toMatch(/mailto/);
    expect(part('Security')).toMatch(/highlight/);
  });
});

const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
const tags = new Set(git('tag', '--list').split('\n'));
const releases = [...changelog.matchAll(/^## (1\.\d+\.\d+) \(\d{4}-\d{2}-\d{2}\)$/gm)].map(([, release]) => release);
const untagged = releases.filter((release) => !tags.has(`v${release}`));
const taggedSection = (release: string) => {
  const tagged = git('show', `v${release}:CHANGELOG.md`);
  return sectionOf(tagged, releaseHeading(tagged, release));
};

// Tagging a release while a feature branch is in flight dates that branch's entries by accident: merging it folds
// its Unreleased list into the section the release has just dated, which git resolves without a conflict and the
// heading rule above reads as one list of each kind. 1.5.0 shipped that way. A tag is the record of what a version
// published, so a dated section has to keep reading as its tag left it. The 0.x sections predate the promise.
describe('every 1.x release', () => {
  it('is tagged, but for the newest, which a release branch dates before its tag exists', () => {
    expect(releases.length).toBeGreaterThan(0);
    expect(untagged.length).toBeLessThan(2);
    expect(untagged).toEqual(releases.slice(0, untagged.length));
  });

  it.each(releases.filter((release) => tags.has(`v${release}`)))('%s reads as its tag left it', (release) => {
    expect(sectionOf(changelog, releaseHeading(changelog, release))).toBe(taggedSection(release));
  });
});
