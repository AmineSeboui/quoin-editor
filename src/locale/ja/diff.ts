import type { DiffLabels } from '../../diff/diff-labels';

const ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  type: 'ブロックの種類',
  indent: 'インデント',
  kind: 'ブロックのスタイル',
  level: '見出しのレベル',
  checked: 'チェックボックス',
  start: '番号',
  align: '揃え',
  color: '色',
  background: '背景',
  alt: '代替テキスト',
  url: 'アドレス',
  storageKey: 'ファイル',
  filename: 'ファイル名',
  width: 'サイズ',
  height: 'サイズ',
  widthPercent: 'サイズ',
  language: '言語',
  code: 'コード',
  tone: '種類',
  icon: 'アイコン',
  open: '開閉の状態',
  latex: '数式',
  header: '見出し行',
  rows: '行',
  cols: '列',
};

const changed = (attributes: readonly string[]): string => {
  const names = [...new Set(attributes.flatMap((name) => ATTRIBUTE_NAMES[name] ?? []))];
  return names.length === 0 ? '変更' : `変更: ${names.join('、')}`;
};

/** Every string the diff view shows or speaks, in Japanese. */
export const jaDiffLabels: DiffLabels = {
  added: '追加',
  removed: '削除',
  moved: 'ここへ移動',
  movedAway: 'ここから移動',
  changed,
  inserted: '挿入',
  insertedEnd: '挿入ここまで',
  deleted: '削除',
  deletedEnd: '削除ここまで',
  emptyTask: 'タスク',
};
