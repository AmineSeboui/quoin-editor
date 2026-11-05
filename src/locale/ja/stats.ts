import type { StatsLabels } from '../../extensions/stats/stats-labels';
import { number } from './format';

const counted = (unit: string) => (count: number) => `${number(count)} ${unit}`;

const characters = counted('文字');

/** Every string the statistics feature shows or speaks, in Japanese. */
export const jaStatsLabels: StatsLabels = {
  characters,
  words: counted('語'),
  blocks: counted('ブロック'),
  characterLimit: (count, limit) => `${number(count)} / ${characters(limit)}`,
  limitReached: (limit) => `${number(limit)} 文字の上限に達しました`,
};
