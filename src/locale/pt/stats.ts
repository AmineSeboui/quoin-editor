import type { StatsLabels } from '../../extensions/stats/stats-labels';
import { number, plural } from './format';

const counted = (one: string, other: string) => (count: number) => `${number(count)} ${plural(count, { one, other })}`;

const characters = counted('caractere', 'caracteres');

/** Every string the statistics feature shows or speaks, in Portuguese. */
export const ptStatsLabels: StatsLabels = {
  characters,
  words: counted('palavra', 'palavras'),
  blocks: counted('bloco', 'blocos'),
  characterLimit: (count, limit) => `${number(count)} / ${characters(limit)}`,
  limitReached: (limit) => `Limite de ${number(limit)} caracteres atingido`,
};
