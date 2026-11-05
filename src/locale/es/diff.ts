import type { DiffLabels } from '../../diff/diff-labels';

const ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  type: 'tipo de bloque',
  indent: 'sangría',
  kind: 'estilo del bloque',
  level: 'nivel del título',
  checked: 'casilla',
  start: 'numeración',
  align: 'alineación',
  color: 'color',
  background: 'fondo',
  alt: 'texto alternativo',
  url: 'dirección',
  storageKey: 'archivo',
  filename: 'nombre del archivo',
  width: 'tamaño',
  height: 'tamaño',
  widthPercent: 'tamaño',
  language: 'lenguaje',
  code: 'código',
  tone: 'tipo',
  icon: 'icono',
  open: 'estado de apertura',
  latex: 'fórmula',
  header: 'fila de encabezado',
  rows: 'filas',
  cols: 'columnas',
};

const changed = (attributes: readonly string[]): string => {
  const names = [...new Set(attributes.flatMap((name) => ATTRIBUTE_NAMES[name] ?? []))];
  return names.length === 0 ? 'Cambiado' : `Cambiado: ${names.join(', ')}`;
};

/** Every string the diff view shows or speaks, in Spanish. */
export const esDiffLabels: DiffLabels = {
  added: 'Añadido',
  removed: 'Eliminado',
  moved: 'Movido',
  movedAway: 'Movido a otro lugar',
  changed,
  inserted: 'insertado',
  insertedEnd: 'fin de lo insertado',
  deleted: 'eliminado',
  deletedEnd: 'fin de lo eliminado',
  emptyTask: 'Tarea',
};
