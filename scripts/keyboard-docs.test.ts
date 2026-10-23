// @vitest-environment node
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { englishLabels } from '../src/i18n/english-labels';
import { formatShortcut } from '../src/shortcuts/format-shortcut';
import { shortcutGroups } from '../src/shortcuts/shortcut-groups';
import { docsDir, readText, root } from './docs-sources.mjs';

const PAGE = join(docsDir, 'keyboard.md');
const page = existsSync(PAGE) ? readText(PAGE) : '';

type Row = { action: string; mac: string; other: string };

const rowsOf = (markdown: string): Row[] =>
  markdown
    .split('\n')
    .map((line) => /^\| (.+?) \| (.+?) \| (.+?) \|$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null && !/^-+$/.test(match[2]) && match[2] !== 'macOS')
    .map(([, action, mac, other]) => ({ action, mac, other }));

// The keys the opt-in features add beside the canvas's own, each where its keymap or handler binds it.
const FEATURE_KEYS = [
  { action: 'Find and replace', chord: 'Mod-Shift-f', file: 'src/extensions/find/use-find-shortcut.ts', bound: "'Mod-Shift-f'" },
  { action: 'Comment on the selection', chord: 'Mod-Alt-m', file: 'src/extensions/comments/comments-extension.tsx', bound: "'Mod-Alt-m'" },
  { action: 'Ask AI, on an empty paragraph', chord: 'Space', file: 'src/extensions/ai/ai-extension.tsx', bound: "' ': openOnSpace" },
  { action: 'Next table cell', chord: 'Tab', file: 'src/extensions/table/table-keys.ts', bound: 'Tab: nextCell' },
  { action: 'Previous table cell', chord: 'Shift-Tab', file: 'src/extensions/table/table-keys.ts', bound: "'Shift-Tab': previousCell" },
];

const written = (chord: string) => ({ mac: formatShortcut(chord, { isMac: true }), other: formatShortcut(chord, { isMac: false }) });

const dialogRows = (): Row[] => {
  const mac = shortcutGroups(englishLabels, true).flatMap(({ items }) => items);
  const other = shortcutGroups(englishLabels, false).flatMap(({ items }) => items);
  return mac.map((item, index) => ({ action: item.label, mac: item.keys, other: other[index].keys }));
};

const featureRows = (): Row[] => FEATURE_KEYS.map(({ action, chord }) => ({ action, ...written(chord) }));

describe('the keyboard page', () => {
  const listed = rowsOf(page);

  it('lists every key of the shortcuts dialog, as macOS and the other platforms write it', () => {
    const missing = dialogRows().filter((row) => !listed.some((entry) => JSON.stringify(entry) === JSON.stringify(row)));
    expect(missing).toEqual([]);
  });

  it('lists the keys of the opt-in features', () => {
    const missing = featureRows().filter((row) => !listed.some((entry) => JSON.stringify(entry) === JSON.stringify(row)));
    expect(missing).toEqual([]);
  });

  it('lists no key the code does not bind', () => {
    const known = [...dialogRows(), ...featureRows()].map((row) => JSON.stringify(row));
    expect(listed.filter((row) => !known.includes(JSON.stringify(row)))).toEqual([]);
  });

  it.each(FEATURE_KEYS)('finds $action bound in $file', ({ file, bound }) => {
    expect(readText(join(root, file))).toContain(bound);
  });
});
