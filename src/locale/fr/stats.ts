import type { StatsLabels } from '../../extensions/stats/stats-labels';
import { number, plural } from './format';

const counted = (one: string, other: string) => (count: number) => `${number(count)} ${plural(count, { one, other })}`;

const characters = counted('caractère', 'caractères');

/** Every string the statistics feature shows or speaks, in French. */
export const frStatsLabels: StatsLabels = {
  characters,
  words: counted('mot', 'mots'),
  blocks: counted('bloc', 'blocs'),
  characterLimit: (count, limit) => `${number(count)} / ${characters(limit)}`,
  limitReached: (limit) => `Limite de ${number(limit)} caractères atteinte`,
};
