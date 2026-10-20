/** Every string the mention feature shows or speaks. */
export type MentionLabels = {
  /** The name of the menu `@` opens. */
  mentionMenu: string;
  /** What the menu shows while the host searches. */
  searching: string;
  /** What the menu shows when the host finds nothing. */
  noMatches: string;
  /** The accessible description of a mention, which names its kind when it has one. */
  mentionDescription(kind: string | undefined): string;
};

export const englishMentionLabels: MentionLabels = {
  mentionMenu: 'Mentions',
  searching: 'Searching\u2026',
  noMatches: 'No matches',
  mentionDescription: (kind) => (kind === undefined ? 'Mention' : `Mention, ${kind}`),
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveMentionLabels(overrides?: Partial<MentionLabels>): MentionLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishMentionLabels : { ...englishMentionLabels, ...Object.fromEntries(given) };
}
