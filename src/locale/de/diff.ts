import type { DiffLabels } from '../../diff/diff-labels';

const ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  type: 'Blocktyp',
  indent: 'Einzug',
  kind: 'Blockstil',
  level: 'Überschriftsebene',
  checked: 'Kontrollkästchen',
  start: 'Nummerierung',
  align: 'Ausrichtung',
  color: 'Farbe',
  background: 'Hintergrund',
  alt: 'Alternativtext',
  url: 'Adresse',
  storageKey: 'Datei',
  filename: 'Dateiname',
  width: 'Größe',
  height: 'Größe',
  widthPercent: 'Größe',
  language: 'Sprache',
  code: 'Code',
  tone: 'Art',
  icon: 'Symbol',
  open: 'Offen oder zu',
  latex: 'Formel',
  header: 'Kopfzeile',
  rows: 'Zeilen',
  cols: 'Spalten',
};

const changed = (attributes: readonly string[]): string => {
  const names = [...new Set(attributes.flatMap((name) => ATTRIBUTE_NAMES[name] ?? []))];
  return names.length === 0 ? 'Geändert' : `Geändert: ${names.join(', ')}`;
};

/** Every string the diff view shows or speaks, in German. */
export const deDiffLabels: DiffLabels = {
  added: 'Hinzugefügt',
  removed: 'Entfernt',
  moved: 'Verschoben',
  movedAway: 'Von hier verschoben',
  changed,
  inserted: 'eingefügt',
  insertedEnd: 'Ende des Eingefügten',
  deleted: 'gelöscht',
  deletedEnd: 'Ende des Gelöschten',
  emptyTask: 'Aufgabe',
};
