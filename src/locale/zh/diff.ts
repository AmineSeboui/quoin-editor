import type { DiffLabels } from '../../diff/diff-labels';

const ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  type: '块类型',
  indent: '缩进',
  kind: '块样式',
  level: '标题级别',
  checked: '复选框',
  start: '编号',
  align: '对齐方式',
  color: '颜色',
  background: '背景',
  alt: '替代文字',
  url: '地址',
  storageKey: '文件',
  filename: '文件名',
  width: '尺寸',
  height: '尺寸',
  widthPercent: '尺寸',
  language: '语言',
  code: '代码',
  tone: '类型',
  icon: '图标',
  open: '展开状态',
  latex: '公式',
  header: '表头行',
  rows: '行',
  cols: '列',
};

const changed = (attributes: readonly string[]): string => {
  const names = [...new Set(attributes.flatMap((name) => ATTRIBUTE_NAMES[name] ?? []))];
  return names.length === 0 ? '已更改' : `已更改：${names.join('、')}`;
};

/** Every string the diff view shows or speaks, in Simplified Chinese. */
export const zhDiffLabels: DiffLabels = {
  added: '新增',
  removed: '删除',
  moved: '移动到此',
  movedAway: '移动走了',
  changed,
  inserted: '插入',
  insertedEnd: '插入内容结束',
  deleted: '删除',
  deletedEnd: '删除内容结束',
  emptyTask: '待办事项',
};
