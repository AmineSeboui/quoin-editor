import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { englishLabels } from '../src/i18n/english-labels';
import { formatShortcut } from '../src/shortcuts/format-shortcut';
import { shortcutGroups } from '../src/shortcuts/shortcut-groups';
import { CANVAS_EXTENSIONS, canvasChords, featureChords } from './bound-keys';
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

// The keys the view or a hook reads from the keyboard event itself rather than through a keymap, each with the code
// that reads it, so that removing the handler fails here as removing a keymap entry does.
const READ_FROM_EVENTS = [
  { chord: 'Mod-Enter', file: 'src/view/input/keydown.ts', reads: "event.key !== 'Enter' || !isMod" },
  { chord: 'Alt-F10', file: 'src/menus/floating/use-focus-key.ts', reads: "event.key === 'F10' && event.altKey" },
  { chord: 'ArrowUp', file: 'src/view/input/keydown.ts', reads: 'Object.hasOwn(ARROWS, event.key)' },
  { chord: 'ArrowDown', file: 'src/view/input/keydown.ts', reads: 'Object.hasOwn(ARROWS, event.key)' },
  { chord: 'ArrowLeft', file: 'src/view/input/keydown.ts', reads: 'Object.hasOwn(ARROWS, event.key)' },
  { chord: 'ArrowRight', file: 'src/view/input/keydown.ts', reads: 'Object.hasOwn(ARROWS, event.key)' },
  { chord: 'Shift-ArrowUp', file: 'src/view/input/keydown.ts', reads: 'move(controller, direction, event.shiftKey)' },
  { chord: 'Shift-ArrowDown', file: 'src/view/input/keydown.ts', reads: 'move(controller, direction, event.shiftKey)' },
  { chord: '/', file: 'src/menus/slash/slash-extension.tsx', reads: "char: '/'" },
  { chord: 'Mod-Shift-f', file: 'src/extensions/find/use-find-shortcut.ts', reads: "normalizeKey('Mod-Shift-f', isMac)" },
];

// Keys the view reads from the event that differ between the platforms by more than Mod: the chord on a Mac and the
// one elsewhere.
const DOCUMENT_EDGE_KEYS = "['ArrowUp', 'ArrowDown'] : ['Home', 'End']";
const PLATFORM_KEYS = [
  { mac: 'Mod-ArrowUp', other: 'Mod-Home', file: 'src/view/input/keydown.ts', reads: DOCUMENT_EDGE_KEYS },
  { mac: 'Mod-ArrowDown', other: 'Mod-End', file: 'src/view/input/keydown.ts', reads: DOCUMENT_EDGE_KEYS },
];

// Bound chords the page leaves out on purpose.
const UNDOCUMENTED = [
  // Shift and the slash type a question mark on a US keyboard, so the dialog's Mod+Shift+/ is bound under this name too.
  'Mod-Shift-?',
  // Extending the selection over a formula or a mention, as Shift and an arrow extend it over any character.
  'Shift-ArrowLeft',
  'Shift-ArrowRight',
];

const keyName = (chord: string) => (chord === ' ' ? 'Space' : chord);
const written = (chord: string) => [formatShortcut(keyName(chord), { isMac: true }), formatShortcut(keyName(chord), { isMac: false })];

/** The single keys of a cell, which writes alternatives as "A or B" and sequences as "A, then B". */
const partsOf = (cell: string) => cell.split(/ or |, then /);

const documented = rowsOf(page).flatMap(({ mac, other }) => {
  const [macParts, otherParts] = [partsOf(mac), partsOf(other)];
  return macParts.map((part, index) => `${part} | ${otherParts[index]}`);
});

const dialog = () => {
  const mac = shortcutGroups(englishLabels, true).flatMap(({ items }) => items);
  const other = shortcutGroups(englishLabels, false).flatMap(({ items }) => items);
  return mac.flatMap((item, index) => partsOf(item.keys).map((part, i) => `${part} | ${partsOf(other[index].keys)[i]}`));
};

const pair = (chord: string) => written(chord).join(' | ');
const bound = () => [...canvasChords(), ...featureChords(), ...READ_FROM_EVENTS.map(({ chord }) => chord)];
const platformPairs = PLATFORM_KEYS.map(
  ({ mac, other }) => `${formatShortcut(mac, { isMac: true })} | ${formatShortcut(other, { isMac: false })}`,
);
const boundPairs = () => new Set([...bound().map(pair), ...platformPairs]);

describe('the keyboard page', () => {
  it('lists only keys the code binds', () => {
    expect(documented.filter((keys) => !boundPairs().has(keys))).toEqual([]);
  });

  it("lists every key the canvas's own keymaps bind", () => {
    const listed = new Set(documented);
    const missing = canvasChords().filter((chord) => !UNDOCUMENTED.includes(chord) && !listed.has(pair(chord)));
    expect(missing).toEqual([]);
  });

  it("lists every key the opt-in features' keymaps bind", () => {
    const listed = new Set(documented);
    const missing = featureChords().filter((chord) => !UNDOCUMENTED.includes(chord) && !listed.has(pair(chord)));
    expect(missing).toEqual([]);
  });

  it('lists every row of the shortcuts dialog with its label and keys', () => {
    const rows = rowsOf(page).map((row) => JSON.stringify(row));
    const mac = shortcutGroups(englishLabels, true).flatMap(({ items }) => items);
    const other = shortcutGroups(englishLabels, false).flatMap(({ items }) => items);
    const missing = mac
      .map((item, index) => ({ action: item.label, mac: item.keys, other: other[index].keys }))
      .filter((row) => !rows.includes(JSON.stringify(row)));
    expect(missing).toEqual([]);
  });

  it.each(READ_FROM_EVENTS)('finds $chord read from the event in $file', ({ file, reads }) => {
    expect(readText(join(root, file))).toContain(reads);
  });

  it.each(PLATFORM_KEYS)('finds $mac and $other read from the event in $file', ({ file, reads }) => {
    expect(readText(join(root, file))).toContain(reads);
  });

  it('lists the keys that differ between the platforms', () => {
    expect(platformPairs.filter((keys) => !documented.includes(keys))).toEqual([]);
  });
});

describe('the keymaps read here', () => {
  it('are those BlockCanvas mounts', () => {
    const source = readText(join(root, 'src/canvas/BlockCanvas.tsx'));
    const list = /const \[allExtensions\] = useState\(\(\) => \[([\s\S]*?)\]\);/.exec(source)?.[1] ?? '';
    const entries = list.split(',').map((entry) => entry.trim()).filter((entry) => entry !== '');
    expect(entries).toEqual([...CANVAS_EXTENSIONS, '...(extensions ?? [])']);
  });
});

describe('the shortcuts dialog', () => {
  it('lists only keys the code binds', () => {
    expect(dialog().filter((keys) => !boundPairs().has(keys))).toEqual([]);
  });

  it("lists every key the canvas's own keymaps bind", () => {
    const listed = new Set(dialog());
    expect(canvasChords().filter((chord) => !UNDOCUMENTED.includes(chord) && !listed.has(pair(chord)))).toEqual([]);
  });
});
