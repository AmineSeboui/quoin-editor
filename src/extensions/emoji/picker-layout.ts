import type { Emoji, EmojiGroup } from '../../emoji/emoji-types';
import type { EmojiLabels } from './emoji-labels';
import type { GridCell } from './grid-moves';

/** A grid of the picker: its name, the emoji of its cells in rows, and where each of them is. */
export type PickerSection = {
  readonly key: string;
  readonly label: string;
  readonly rows: readonly (readonly Emoji[])[];
  readonly rowLengths: readonly number[];
  /** Where each emoji is, by its character. */
  readonly places: ReadonlyMap<string, GridCell>;
};

export type PickerLayout = readonly PickerSection[];

const COLUMNS = 8;

function section(key: string, label: string, emoji: readonly Emoji[]): PickerSection {
  const rows: Emoji[][] = [];
  for (let start = 0; start < emoji.length; start += COLUMNS) rows.push(emoji.slice(start, start + COLUMNS));
  const places = new Map<string, GridCell>();
  rows.forEach((cells, row) => cells.forEach((cell, col) => places.set(cell.emoji, { row, col })));
  return { key, label, rows, rowLengths: rows.map((cells) => cells.length), places };
}

function grouped(found: readonly Emoji[], labels: EmojiLabels): PickerSection[] {
  const byGroup = new Map<EmojiGroup, Emoji[]>();
  for (const emoji of found) {
    const group = byGroup.get(emoji.group);
    if (group === undefined) byGroup.set(emoji.group, [emoji]);
    else group.push(emoji);
  }
  return [...byGroup].map(([group, emoji]) => section(group, labels.groups[group], emoji));
}

/**
 * The grids for the emoji found, in rows of eight: one for each group, in the order the groups come, or while the
 * picker searches one of the matches in their order, and none when nothing is found.
 */
export function pickerLayout(found: readonly Emoji[], searching: boolean, labels: EmojiLabels): PickerLayout {
  if (found.length === 0) return [];
  return searching ? [section('results', labels.searchResults, found)] : grouped(found, labels);
}
