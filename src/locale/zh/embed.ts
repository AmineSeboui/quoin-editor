import type { EmbedLabels } from '../../extensions/embed/embed-labels';

const PROVIDER_FRAMES: Readonly<Record<string, string>> = {
  youtube: 'YouTube 视频',
  vimeo: 'Vimeo 视频',
  loom: 'Loom 视频',
  figma: 'Figma 设计稿',
  codepen: 'CodePen 作品',
  spotify: 'Spotify 播放器',
  soundcloud: 'SoundCloud 播放器',
};

/** Every string the embed and bookmark feature shows or speaks, in Simplified Chinese. */
export const zhEmbedLabels: EmbedLabels = {
  embed: '嵌入',
  embedDescription: '由链接生成的视频、设计稿或播放器',
  bookmark: '书签',
  bookmarkDescription: '指向某个页面的卡片',
  frameTitle: (provider) => (Object.hasOwn(PROVIDER_FRAMES, provider) ? PROVIDER_FRAMES[provider] : `${provider} 嵌入`),
  linkOptions: '链接选项',
  keepAsLink: '保留为链接',
  embedLink: '要嵌入的链接',
  bookmarkLink: '要加为书签的链接',
  notALink: '请输入网址，例如 https://example.com',
  cannotEmbed: '该链接无法嵌入。',
  bookmarkInstead: '改为加入书签',
};
