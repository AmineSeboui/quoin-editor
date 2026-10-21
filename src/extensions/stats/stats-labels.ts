/** Every string the stats footer shows and the character limit speaks. */
export type StatsLabels = {
  /** How many characters, words and blocks the document holds. */
  characters(count: number): string;
  words(count: number): string;
  blocks(count: number): string;
  /** How many characters the document holds of the most it may hold. */
  characterLimit(count: number, limit: number): string;
  /** What is announced when an edit is refused because it would take the document past its limit. */
  limitReached(limit: number): string;
};

const grouped = (value: number) => String(value).replace(/\B(?=(\d{3})+$)/g, ',');

const counted = (one: string, many: string) => (count: number) => `${grouped(count)} ${count === 1 ? one : many}`;

export const englishStatsLabels: StatsLabels = {
  characters: counted('character', 'characters'),
  words: counted('word', 'words'),
  blocks: counted('block', 'blocks'),
  characterLimit: (count, limit) => `${grouped(count)} / ${counted('character', 'characters')(limit)}`,
  limitReached: (limit) => `Character limit of ${grouped(limit)} reached`,
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveStatsLabels(overrides?: Partial<StatsLabels>): StatsLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishStatsLabels : { ...englishStatsLabels, ...Object.fromEntries(given) };
}
