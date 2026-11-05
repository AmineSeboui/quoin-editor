import type { DiffLabels } from '../../diff/diff-labels';

const ATTRIBUTE_NAMES: Readonly<Record<string, string>> = {
  type: 'نوع الكتلة',
  indent: 'الإزاحة',
  kind: 'نمط الكتلة',
  level: 'مستوى العنوان',
  checked: 'مربع التأشير',
  start: 'الترقيم',
  align: 'المحاذاة',
  color: 'اللون',
  background: 'الخلفية',
  alt: 'النص البديل',
  url: 'العنوان',
  storageKey: 'الملف',
  filename: 'اسم الملف',
  width: 'الحجم',
  height: 'الحجم',
  widthPercent: 'الحجم',
  language: 'اللغة',
  code: 'الشيفرة',
  tone: 'النوع',
  icon: 'الأيقونة',
  open: 'حالة الفتح',
  latex: 'الصيغة',
  header: 'صف العناوين',
  rows: 'الصفوف',
  cols: 'الأعمدة',
};

const changed = (attributes: readonly string[]): string => {
  const names = [...new Set(attributes.flatMap((name) => ATTRIBUTE_NAMES[name] ?? []))];
  return names.length === 0 ? 'تغيّرت' : `تغيّر: ${names.join('، ')}`;
};

/** Every string the diff view shows or speaks, in Arabic. */
export const arDiffLabels: DiffLabels = {
  added: 'مضافة',
  removed: 'محذوفة',
  moved: 'منقولة',
  movedAway: 'نُقلت من هنا',
  changed,
  inserted: 'مُدرج',
  insertedEnd: 'نهاية المُدرج',
  deleted: 'محذوف',
  deletedEnd: 'نهاية المحذوف',
  emptyTask: 'مهمة',
};
