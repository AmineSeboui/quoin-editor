import type { EmojiGroup } from '../../emoji/emoji-types';

/** Every string the emoji feature shows or speaks. */
export type EmojiLabels = {
  /** The name of the menu `:` opens. */
  emojiMenu: string;
  /** What the menu and the picker show while the emoji load. */
  loading: string;
  /** What they show when the emoji cannot be loaded. */
  loadFailed: string;
  /** What they show when no emoji matches. */
  noMatches: string;
  /** The block menu action of a callout that opens the picker for its icon, and the name of that picker. */
  chooseIcon: string;
  /** The name of the picker's search field. */
  searchEmoji: string;
  /** The name of the picker's grid of the emoji its search finds. */
  searchResults: string;
  /** The names of the picker's grids, one for each group of emoji. */
  groups: Readonly<Record<EmojiGroup, string>>;
};

export const englishEmojiLabels: EmojiLabels = {
  emojiMenu: 'Emoji',
  loading: 'Loading emoji\u2026',
  loadFailed: 'Emoji could not be loaded',
  noMatches: 'No emoji found',
  chooseIcon: 'Choose icon',
  searchEmoji: 'Search emoji',
  searchResults: 'Search results',
  groups: {
    smileys: 'Smileys and emotion',
    people: 'People and body',
    animals: 'Animals and nature',
    food: 'Food and drink',
    travel: 'Travel and places',
    activities: 'Activities',
    objects: 'Objects',
    symbols: 'Symbols',
    flags: 'Flags',
  },
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveEmojiLabels(overrides?: Partial<EmojiLabels>): EmojiLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishEmojiLabels : { ...englishEmojiLabels, ...Object.fromEntries(given) };
}
