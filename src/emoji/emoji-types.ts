/** The groups of the emoji dataset, in the order the picker shows them. */
export type EmojiGroup = 'smileys' | 'people' | 'animals' | 'food' | 'travel' | 'activities' | 'objects' | 'symbols' | 'flags';

/** An emoji of the dataset, in its base form. */
export type Emoji = {
  readonly emoji: string;
  /** Its GitHub shortcodes, without colons, the first being the one it is called by. Some new emoji have none. */
  readonly shortcodes: readonly string[];
  readonly tags: readonly string[];
  readonly group: EmojiGroup;
};

/** An emoji as the generated data module stores it. */
export type EmojiRow = readonly [emoji: string, shortcodes: readonly string[], tags: readonly string[], group: EmojiGroup];
