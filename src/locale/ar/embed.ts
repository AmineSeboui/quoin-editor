import type { EmbedLabels } from '../../extensions/embed/embed-labels';

const PROVIDER_FRAMES: Readonly<Record<string, string>> = {
  youtube: 'فيديو YouTube',
  vimeo: 'فيديو Vimeo',
  loom: 'فيديو Loom',
  figma: 'تصميم Figma',
  codepen: 'صفحة CodePen',
  spotify: 'مشغل Spotify',
  soundcloud: 'مشغل SoundCloud',
};

/** Every string the embed and bookmark feature shows or speaks, in Arabic. */
export const arEmbedLabels: EmbedLabels = {
  embed: 'تضمين',
  embedDescription: 'فيديو أو تصميم أو مشغل من رابط',
  bookmark: 'إشارة مرجعية',
  bookmarkDescription: 'بطاقة تحيل إلى صفحة',
  frameTitle: (provider) => (Object.hasOwn(PROVIDER_FRAMES, provider) ? PROVIDER_FRAMES[provider] : `تضمين ${provider}`),
  linkOptions: 'خيارات الرابط',
  keepAsLink: 'الإبقاء عليه رابطًا',
  embedLink: 'رابط للتضمين',
  bookmarkLink: 'رابط للإشارة المرجعية',
  notALink: 'أدخل عنوان ويب، مثل https://example.com',
  cannotEmbed: 'لا يمكن تضمين هذا الرابط.',
  bookmarkInstead: 'إشارة مرجعية بدلًا من ذلك',
};
