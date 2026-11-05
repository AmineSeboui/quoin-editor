import type { StatsLabels } from '../../extensions/stats/stats-labels';
import { number, plural } from './format';

const counted = (one: string, other: string) => (count: number) => `${number(count)} ${plural(count, { one, other })}`;

const characters = counted('Zeichen', 'Zeichen');

/** Every string the statistics feature shows or speaks, in German. */
export const deStatsLabels: StatsLabels = {
  characters,
  words: counted('Wort', 'Wörter'),
  blocks: counted('Block', 'Blöcke'),
  characterLimit: (count, limit) => `${number(count)} / ${characters(limit)}`,
  limitReached: (limit) => `Grenze von ${number(limit)} Zeichen erreicht`,
};
