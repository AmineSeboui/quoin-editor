import type { Emoji, EmojiGroup } from '../../emoji/emoji-types';
import type { EmojiLabels } from './emoji-labels';
import type { GridCell } from './grid-moves';

/** A grid of the picker: its name, the emoji of its cells in rows, and where its first row comes among all the rows. */
export type PickerSection = {
  readonly key: string;
  readonly label: string;
  readonly rows: readonly (readonly Emoji[])[];
  readonly firstRow: number;
};

type Unplaced = Omit<PickerSection, 'firstRow'>;

export type PickerLayout = {
  readonly sections: readonly PickerSection[];
  /** The rows of every section in turn, as the arrows walk them. */
  readonly rows: readonly (readonly Emoji[])[];
  /** How many cells each of those rows holds. */
  readonly rowLengths: readonly number[];
  /** Where each emoji is, by its character. */
  readonly places: ReadonlyMap<string, GridCell>;
};

const COLUMNS = 8;

function inRows(emoji: readonly Emoji[]): Emoji[][] {
  const rows: Emoji[][] = [];
  for (let start = 0; start < emoji.length; start += COLUMNS) rows.push(emoji.slice(start, start + COLUMNS));
  return rows;
}

function grouped(found: readonly Emoji[], labels: EmojiLabels): Unplaced[] {
  const byGroup = new Map<EmojiGroup, Emoji[]>();
  for (const emoji of found) {
    const group = byGroup.get(emoji.group);
    if (group === undefined) byGroup.set(emoji.group, [emoji]);
    else group.push(emoji);
  }
  return [...byGroup].map(([group, emoji]) => ({ key: group, label: labels.groups[group], rows: inRows(emoji) }));
}

/**
 * The grids for the emoji found, in rows of eight: one for each group, in the order the groups come, or while the
 * picker searches one of the matches in their order, and none when nothing is found.
 */
export function pickerLayout(found: readonly Emoji[], searching: boolean, labels: EmojiLabels): PickerLayout {
  const unplaced: Unplaced[] =
    found.length === 0
      ? []
      : searching
        ? [{ key: 'results', label: labels.searchResults, rows: inRows(found) }]
        : grouped(found, labels);
  let firstRow = 0;
  const sections = unplaced.map((section) => {
    const placed = { ...section, firstRow };
    firstRow += section.rows.length;
    return placed;
  });
  const rows = sections.flatMap((section) => section.rows);
  const places = new Map<string, GridCell>();
  rows.forEach((cells, row) => cells.forEach(({ emoji }, col) => places.set(emoji, { row, col })));
  return { sections, rows, rowLengths: rows.map((cells) => cells.length), places };
}
