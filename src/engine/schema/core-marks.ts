import { markRank } from '../model/marks';
import type { MarkSpec } from './types';

const CORE_MARKS = [
  'link',
  'comment',
  'bold',
  'italic',
  'underline',
  'strike',
  'sub',
  'sup',
  'highlight',
  'color',
  'background',
  'code',
] as const;

const ANCHORED = new Set(['link', 'comment']);

export const coreMarkSpecs: MarkSpec[] = CORE_MARKS.map((type) => ({
  type,
  rank: markRank(type),
  inclusive: !ANCHORED.has(type),
  ...(type === 'comment' ? { stackable: true } : {}),
}));
