import type { EmbedLabels } from '../../extensions/embed/embed-labels';

const PROVIDER_FRAMES: Readonly<Record<string, string>> = {
  youtube: 'YouTube の動画',
  vimeo: 'Vimeo の動画',
  loom: 'Loom の動画',
  figma: 'Figma のデザイン',
  codepen: 'CodePen の作品',
  spotify: 'Spotify のプレーヤー',
  soundcloud: 'SoundCloud のプレーヤー',
};

/** Every string the embed and bookmark feature shows or speaks, in Japanese. */
export const jaEmbedLabels: EmbedLabels = {
  embed: '埋め込み',
  embedDescription: 'リンクから作る動画、デザイン、プレーヤー',
  bookmark: 'ブックマーク',
  bookmarkDescription: 'ページへのリンクを載せたカード',
  frameTitle: (provider) =>
    Object.hasOwn(PROVIDER_FRAMES, provider) ? PROVIDER_FRAMES[provider] : `${provider} の埋め込み`,
  linkOptions: 'リンクのオプション',
  keepAsLink: 'リンクのままにする',
  embedLink: '埋め込むリンク',
  bookmarkLink: 'ブックマークにするリンク',
  notALink: 'ウェブアドレスを入力してください。例: https://example.com',
  cannotEmbed: 'このリンクは埋め込めません。',
  bookmarkInstead: '代わりにブックマークにする',
};
