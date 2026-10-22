/** Every string the diff view shows or speaks. */
export type DiffLabels = {
  /** The label of a block only the newer version has. */
  added: string;
  /** The label of a block only the older version has. */
  removed: string;
  /** The label of a block where it is in the newer version, when it moved. */
  moved: string;
  /** The label of a block where it was in the older version, when it moved. */
  movedAway: string;
  /** The label of a changed block, given the names of the attributes that changed, empty when only its text did. */
  changed(attributes: readonly string[]): string;
  /** Spoken before inserted words, and never shown. */
  inserted: string;
  /** Spoken after inserted words, and never shown. */
  insertedEnd: string;
  /** Spoken before deleted words, and never shown. */
  deleted: string;
  /** Spoken after deleted words, and never shown. */
  deletedEnd: string;
  /** The accessible name of a task checkbox whose item has no text. */
  emptyTask: string;
};

const ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  type: 'block type',
  indent: 'indent',
  kind: 'block style',
  level: 'heading level',
  checked: 'checkbox',
  start: 'numbering',
  align: 'alignment',
  color: 'color',
  background: 'background',
  alt: 'alt text',
  url: 'address',
  storageKey: 'file',
  filename: 'file name',
  width: 'size',
  height: 'size',
  widthPercent: 'size',
  language: 'language',
  code: 'code',
  tone: 'tone',
  icon: 'icon',
  open: 'open state',
  latex: 'formula',
  header: 'header row',
  rows: 'rows',
  cols: 'columns',
};

function changedLabel(attributes: readonly string[]): string {
  const names = [...new Set(attributes.flatMap((name) => ATTRIBUTE_NAMES[name] ?? []))];
  return names.length === 0 ? 'Changed' : `Changed ${names.join(', ')}`;
}

export const englishDiffLabels: DiffLabels = {
  added: 'Added',
  removed: 'Removed',
  moved: 'Moved',
  movedAway: 'Moved away',
  changed: changedLabel,
  inserted: 'inserted',
  insertedEnd: 'end inserted',
  deleted: 'deleted',
  deletedEnd: 'end deleted',
  emptyTask: 'Task',
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveDiffLabels(overrides?: Partial<DiffLabels>): DiffLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishDiffLabels : { ...englishDiffLabels, ...Object.fromEntries(given) };
}
