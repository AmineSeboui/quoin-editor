import type { DiffLabels } from '../../diff/diff-labels';

const ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  type: 'type de bloc',
  indent: 'retrait',
  kind: 'style de bloc',
  level: 'niveau de titre',
  checked: 'case à cocher',
  start: 'numérotation',
  align: 'alignement',
  color: 'couleur',
  background: 'fond',
  alt: 'texte alternatif',
  url: 'adresse',
  storageKey: 'fichier',
  filename: 'nom du fichier',
  width: 'taille',
  height: 'taille',
  widthPercent: 'taille',
  language: 'langage',
  code: 'code',
  tone: 'ton',
  icon: 'icône',
  open: 'état d’ouverture',
  latex: 'formule',
  header: 'ligne d’en-tête',
  rows: 'lignes',
  cols: 'colonnes',
};

const changed = (attributes: readonly string[]): string => {
  const names = [...new Set(attributes.flatMap((name) => ATTRIBUTE_NAMES[name] ?? []))];
  return names.length === 0 ? 'Modifié' : `Modifié : ${names.join(', ')}`;
};

/** Every string the diff view shows or speaks, in French. */
export const frDiffLabels: DiffLabels = {
  added: 'Ajouté',
  removed: 'Supprimé',
  moved: 'Déplacé',
  movedAway: 'Déplacé ailleurs',
  changed,
  inserted: 'inséré',
  insertedEnd: 'fin de l’insertion',
  deleted: 'supprimé',
  deletedEnd: 'fin de la suppression',
  emptyTask: 'Tâche',
};
