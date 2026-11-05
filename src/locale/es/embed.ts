import type { EmbedLabels } from '../../extensions/embed/embed-labels';

const PROVIDER_FRAMES: Readonly<Record<string, string>> = {
  youtube: 'Vídeo de YouTube',
  vimeo: 'Vídeo de Vimeo',
  loom: 'Vídeo de Loom',
  figma: 'Diseño de Figma',
  codepen: 'Pen de CodePen',
  spotify: 'Reproductor de Spotify',
  soundcloud: 'Reproductor de SoundCloud',
};

/** Every string the embed and bookmark feature shows or speaks, in Spanish. */
export const esEmbedLabels: EmbedLabels = {
  embed: 'Incrustación',
  embedDescription: 'Un vídeo, un diseño o un reproductor a partir de un enlace',
  bookmark: 'Marcador',
  bookmarkDescription: 'Una tarjeta que enlaza con una página',
  frameTitle: (provider) =>
    Object.hasOwn(PROVIDER_FRAMES, provider) ? PROVIDER_FRAMES[provider] : `Incrustación de ${provider}`,
  linkOptions: 'Opciones del enlace',
  keepAsLink: 'Dejarlo como enlace',
  embedLink: 'Enlace para incrustar',
  bookmarkLink: 'Enlace para el marcador',
  notALink: 'Introduce una dirección web, por ejemplo https://ejemplo.com',
  cannotEmbed: 'Este enlace no se puede incrustar.',
  bookmarkInstead: 'Crear un marcador en su lugar',
};
