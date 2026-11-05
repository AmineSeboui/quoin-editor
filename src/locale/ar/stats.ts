import type { StatsLabels } from '../../extensions/stats/stats-labels';
import { number, plural } from './format';

const counted = (forms: (count: string) => Partial<Record<Intl.LDMLPluralRule, string>>) => (count: number) =>
  plural(count, forms(number(count)));

const characters = counted((n) => ({
  zero: 'لا أحرف',
  one: 'حرف واحد',
  two: 'حرفان',
  few: `${n} أحرف`,
  many: `${n} حرفًا`,
  other: `${n} حرف`,
}));

/** Every string the statistics feature shows or speaks, in Arabic. */
export const arStatsLabels: StatsLabels = {
  characters,
  words: counted((n) => ({
    zero: 'لا كلمات',
    one: 'كلمة واحدة',
    two: 'كلمتان',
    few: `${n} كلمات`,
    many: `${n} كلمة`,
    other: `${n} كلمة`,
  })),
  blocks: counted((n) => ({
    zero: 'لا كتل',
    one: 'كتلة واحدة',
    two: 'كتلتان',
    few: `${n} كتل`,
    many: `${n} كتلة`,
    other: `${n} كتلة`,
  })),
  characterLimit: (count, limit) => `${number(count)} / ${characters(limit)}`,
  limitReached: (limit) => `بلغت حد ${number(limit)} حرف`,
};
