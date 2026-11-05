import type { EmbedLabels } from '../../extensions/embed/embed-labels';

const PROVIDER_FRAMES: Readonly<Record<string, string>> = {
  youtube: 'YouTube-Video',
  vimeo: 'Vimeo-Video',
  loom: 'Loom-Video',
  figma: 'Figma-Design',
  codepen: 'CodePen-Pen',
  spotify: 'Spotify-Player',
  soundcloud: 'SoundCloud-Player',
};

/** Every string the embed and bookmark feature shows or speaks, in German. */
export const deEmbedLabels: EmbedLabels = {
  embed: 'Einbettung',
  embedDescription: 'Ein Video, Design oder Player aus einem Link',
  bookmark: 'Lesezeichen',
  bookmarkDescription: 'Eine Karte, die auf eine Seite verweist',
  frameTitle: (provider) =>
    Object.hasOwn(PROVIDER_FRAMES, provider) ? PROVIDER_FRAMES[provider] : `Einbettung von ${provider}`,
  linkOptions: 'Linkoptionen',
  keepAsLink: 'Als Link behalten',
  embedLink: 'Link zum Einbetten',
  bookmarkLink: 'Link als Lesezeichen',
  notALink: 'Geben Sie eine Webadresse ein, etwa https://beispiel.de',
  cannotEmbed: 'Dieser Link lässt sich nicht einbetten.',
  bookmarkInstead: 'Stattdessen als Lesezeichen',
};
