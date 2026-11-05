import type { DiffLabels } from '../../diff/diff-labels';

const ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  type: 'tipo do bloco',
  indent: 'recuo',
  kind: 'estilo do bloco',
  level: 'nível do título',
  checked: 'caixa de seleção',
  start: 'numeração',
  align: 'alinhamento',
  color: 'cor',
  background: 'fundo',
  alt: 'texto alternativo',
  url: 'endereço',
  storageKey: 'arquivo',
  filename: 'nome do arquivo',
  width: 'tamanho',
  height: 'tamanho',
  widthPercent: 'tamanho',
  language: 'linguagem',
  code: 'código',
  tone: 'tipo',
  icon: 'ícone',
  open: 'estado de abertura',
  latex: 'fórmula',
  header: 'linha de cabeçalho',
  rows: 'linhas',
  cols: 'colunas',
};

const changed = (attributes: readonly string[]): string => {
  const names = [...new Set(attributes.flatMap((name) => ATTRIBUTE_NAMES[name] ?? []))];
  return names.length === 0 ? 'Alterado' : `Alterado: ${names.join(', ')}`;
};

/** Every string the diff view shows or speaks, in Portuguese. */
export const ptDiffLabels: DiffLabels = {
  added: 'Adicionado',
  removed: 'Removido',
  moved: 'Movido',
  movedAway: 'Movido daqui',
  changed,
  inserted: 'inserido',
  insertedEnd: 'fim do inserido',
  deleted: 'excluído',
  deletedEnd: 'fim do excluído',
  emptyTask: 'Tarefa',
};
