import type { StatsLabels } from '../../extensions/stats/stats-labels';
import { number } from './format';

const counted = (unit: string) => (count: number) => `${number(count)} ${unit}`;

const characters = counted('个字符');

/** Every string the statistics feature shows or speaks, in Simplified Chinese. */
export const zhStatsLabels: StatsLabels = {
  characters,
  words: counted('个词'),
  blocks: counted('个块'),
  characterLimit: (count, limit) => `${number(count)} / ${characters(limit)}`,
  limitReached: (limit) => `已达到 ${number(limit)} 个字符的上限`,
};
