import type { StatsLabels } from '../../extensions/stats/stats-labels';
import { number, plural } from './format';

const counted = (one: string, other: string) => (count: number) => `${number(count)} ${plural(count, { one, other })}`;

const characters = counted('carácter', 'caracteres');

/** Every string the statistics feature shows or speaks, in Spanish. */
export const esStatsLabels: StatsLabels = {
  characters,
  words: counted('palabra', 'palabras'),
  blocks: counted('bloque', 'bloques'),
  characterLimit: (count, limit) => `${number(count)} / ${characters(limit)}`,
  limitReached: (limit) => `Límite de ${number(limit)} caracteres alcanzado`,
};
