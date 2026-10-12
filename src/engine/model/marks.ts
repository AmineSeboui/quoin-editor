import { sameAttrs } from './attrs';
import { compareCodeUnits } from './compare';
import type { Mark } from './types';

const RANK: Readonly<Record<string, number>> = {
  link: 0,
  comment: 1,
  bold: 2,
  italic: 3,
  underline: 4,
  strike: 5,
  sub: 6,
  sup: 7,
  highlight: 8,
  color: 9,
  background: 10,
  code: 11,
};
const CUSTOM_RANK = 7.5;
const STACKABLE = new Set(['comment']);

export function isCoreMark(type: string): boolean {
  return Object.hasOwn(RANK, type);
}

export function markRank(type: string): number {
  return isCoreMark(type) ? RANK[type] : CUSTOM_RANK;
}

export function markKey(mark: Mark): string {
  return STACKABLE.has(mark.type) ? `${mark.type}:${mark.attrs?.id ?? ''}` : mark.type;
}

export function sameMark(a: Mark, b: Mark): boolean {
  return a.type === b.type && sameAttrs(a.attrs, b.attrs);
}

export function compareMarks(a: Mark, b: Mark): number {
  return markRank(a.type) - markRank(b.type) || compareCodeUnits(markKey(a), markKey(b));
}

export function sortMarks(marks: readonly Mark[]): Mark[] {
  return [...marks].sort(compareMarks);
}

export function sameMarkSet(a: readonly Mark[], b: readonly Mark[]): boolean {
  return a.length === b.length && a.every((m, i) => sameMark(m, b[i]));
}

export function addMark(set: readonly Mark[], mark: Mark): Mark[] {
  const key = markKey(mark);
  return sortMarks([...set.filter((m) => markKey(m) !== key), mark]);
}

export function removeMark(set: readonly Mark[], mark: Mark | string): Mark[] {
  if (typeof mark === 'string') return sortMarks(set.filter((m) => m.type !== mark));
  const key = markKey(mark);
  return sortMarks(set.filter((m) => markKey(m) !== key));
}

export function hasMark(set: readonly Mark[], mark: Mark | string): boolean {
  return typeof mark === 'string' ? set.some((m) => m.type === mark) : set.some((m) => sameMark(m, mark));
}
