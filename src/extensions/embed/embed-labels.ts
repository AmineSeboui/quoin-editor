/** Every string the embed and bookmark feature shows or speaks. */
export type EmbedLabels = {
  /** The slash command, the name of an embed, and the choice offered for a pasted link. */
  embed: string;
  embedDescription: string;
  /** The slash command, the name of a bookmark, and the choice offered for a pasted link. */
  bookmark: string;
  bookmarkDescription: string;
  /** The title of an embed's frame, its accessible name, given the name of the provider that frames it. */
  frameTitle(provider: string): string;
  /** The toolbar offered next to a link pasted alone on an empty line. */
  linkOptions: string;
  keepAsLink: string;
  embedLink: string;
  bookmarkLink: string;
  notALink: string;
  cannotEmbed: string;
  bookmarkInstead: string;
};

const PROVIDER_FRAMES: Readonly<Record<string, string>> = {
  youtube: 'YouTube video',
  vimeo: 'Vimeo video',
  loom: 'Loom video',
  figma: 'Figma design',
  codepen: 'CodePen pen',
  spotify: 'Spotify player',
  soundcloud: 'SoundCloud player',
};

export const englishEmbedLabels: EmbedLabels = {
  embed: 'Embed',
  embedDescription: 'A video, design or player from a link',
  bookmark: 'Bookmark',
  bookmarkDescription: 'A card that links to a page',
  frameTitle: (provider) =>
    Object.hasOwn(PROVIDER_FRAMES, provider) ? PROVIDER_FRAMES[provider] : `${provider} embed`,
  linkOptions: 'Link options',
  keepAsLink: 'Keep as link',
  embedLink: 'Link to embed',
  bookmarkLink: 'Link to bookmark',
  notALink: 'Enter a web address, such as https://example.com',
  cannotEmbed: 'This link cannot be embedded.',
  bookmarkInstead: 'Bookmark instead',
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveEmbedLabels(overrides?: Partial<EmbedLabels>): EmbedLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishEmbedLabels : { ...englishEmbedLabels, ...Object.fromEntries(given) };
}
