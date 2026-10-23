// @vitest-environment node
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as headless from '../src/headless';
import * as main from '../src/index';
import { coreCommands } from '../src/engine/extension/core-extensions';
import { readText, root, samplePages, sectionOf } from './docs-sources.mjs';

const MIGRATION = join(root, 'MIGRATION.md');
const migration = readText(MIGRATION);
const manifest = JSON.parse(readText(join(root, 'package.json')));

const mappingRows = () =>
  sectionOf(migration, '### Removed helpers')
    .split('\n')
    .filter((line) => /^\| `/.test(line))
    .map((line) => line.split('|').map((cell) => cell.trim()));
const namesIn = (cell: string) => [...cell.matchAll(/`([A-Za-z_]\w*)/g)].map(([, name]) => name);

describe('the migration guide', () => {
  it.each([
    ['named entities, with the 23 it decodes', /named (HTML )?entit/i, /\b23\b/],
    ['inline images in imported markdown', /inline image/i, /IMAGE/],
    ['the spec command names it does not add', /mergeBackward/, /insertBlocks/],
  ])('states the deviation of %s and its workaround', (_, first, second) => {
    expect(migration).toMatch(first);
    expect(migration).toMatch(second);
  });

  it.each([
    ['formatShortcut from the main entry only', /`formatShortcut`/],
    ['the headless entry holding the view and the engine', /`quoin-editor\/headless`/],
    ['captions read as inline markdown', /caption/i],
    ['typed-in-place definitions drawn only read-only', /ui\.renderers/],
    ['onDelete reporting typing and pasting over blocks', /`onDelete`/],
    ['labels that are functions', /`blockDeleted\b[\s\S]*`undoHint\b/],
    ['lower case English tone names', /lower case/i],
  ])('carries the item of %s', (_, marker) => {
    expect(migration).toMatch(marker);
  });

  it.each([
    ['sourcemaps without their sources', /sourcesContent/],
    ['an opt-in entry for a 0.4 feature', /tableExtension\(\)/],
    ['React 18', /React 18/],
    ['an uncontrolled collaborative canvas', /uncontrolled/i],
    ['the indent field', /`indent`/],
    ['legacy blocks split on their first edit', /first edit/i],
  ])('covers %s', (_, marker) => {
    expect(migration).toMatch(marker);
  });

  it.each(['align', 'color', 'background', 'icon', 'url', 'widthPercent', 'mime'])(
    'names the optional key %s that 1.0 writes, for a strict schema',
    (key) => {
      expect(sectionOf(migration, '### New optional keys')).toContain(`\`${key}\``);
    },
  );

  it('tells a strict schema how to accept the new keys', () => {
    expect(sectionOf(migration, '### New optional keys')).toMatch(/passthrough\(\)[\s\S]*additionalProperties/);
  });

  it.each(['insertAt', 'update', 'remove', 'undo', 'move', 'reorder', 'reset'])('maps BlockList.%s', (member) => {
    expect(mappingRows().some(([, before]) => before === `\`BlockList.${member}\``)).toBe(true);
  });

  it('ends with a checklist', () => {
    expect(sectionOf(migration, '## Checklist')).toMatch(/^- \[ \] /m);
  });

  it('maps every 0.4 headless helper to something 1.0 has and drops it from 1.0', () => {
    const rows = mappingRows();
    expect(rows.length).toBeGreaterThanOrEqual(10);
    const known = new Set([...Object.keys(main), ...Object.keys(coreCommands)]);
    for (const [, before, after] of rows) {
      for (const name of namesIn(before)) {
        expect(name in main || name in headless, name).toBe(false);
      }
      for (const name of namesIn(after)) expect(known.has(name), name).toBe(true);
    }
  });

  it('is typechecked with the README and the docs by check:consumer', () => {
    expect(samplePages().map(({ path }) => path)).toContain(MIGRATION);
  });

  it('ships in the package with the changelog', () => {
    expect(manifest.files).toEqual(expect.arrayContaining(['CHANGELOG.md', 'MIGRATION.md']));
  });

  it('is linked from the README and the FAQ', () => {
    expect(readText(join(root, 'README.md'))).toContain('](MIGRATION.md)');
    expect(readText(join(root, 'demo', 'docs', 'faq.md'))).toContain('/blob/main/MIGRATION.md');
  });
});
