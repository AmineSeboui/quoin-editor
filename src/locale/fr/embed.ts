import type { EmbedLabels } from '../../extensions/embed/embed-labels';

const PROVIDER_FRAMES: Readonly<Record<string, string>> = {
  youtube: 'Vidéo YouTube',
  vimeo: 'Vidéo Vimeo',
  loom: 'Vidéo Loom',
  figma: 'Maquette Figma',
  codepen: 'Pen CodePen',
  spotify: 'Lecteur Spotify',
  soundcloud: 'Lecteur SoundCloud',
};

/** Every string the embed and bookmark feature shows or speaks, in French. */
export const frEmbedLabels: EmbedLabels = {
  embed: 'Intégration',
  embedDescription: 'Une vidéo, une maquette ou un lecteur depuis un lien',
  bookmark: 'Favori',
  bookmarkDescription: 'Une carte qui renvoie à une page',
  frameTitle: (provider) =>
    Object.hasOwn(PROVIDER_FRAMES, provider) ? PROVIDER_FRAMES[provider] : `Intégration ${provider}`,
  linkOptions: 'Options du lien',
  keepAsLink: 'Garder comme lien',
  embedLink: 'Lien à intégrer',
  bookmarkLink: 'Lien à mettre en favori',
  notALink: 'Saisissez une adresse web, par exemple https://exemple.fr',
  cannotEmbed: 'Ce lien ne peut pas être intégré.',
  bookmarkInstead: 'Mettre en favori à la place',
};
