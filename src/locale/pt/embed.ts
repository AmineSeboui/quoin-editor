import type { EmbedLabels } from '../../extensions/embed/embed-labels';

const PROVIDER_FRAMES: Readonly<Record<string, string>> = {
  youtube: 'Vídeo do YouTube',
  vimeo: 'Vídeo do Vimeo',
  loom: 'Vídeo do Loom',
  figma: 'Design do Figma',
  codepen: 'Pen do CodePen',
  spotify: 'Player do Spotify',
  soundcloud: 'Player do SoundCloud',
};

/** Every string the embed and bookmark feature shows or speaks, in Portuguese. */
export const ptEmbedLabels: EmbedLabels = {
  embed: 'Incorporação',
  embedDescription: 'Um vídeo, design ou player a partir de um link',
  bookmark: 'Favorito',
  bookmarkDescription: 'Um cartão que leva a uma página',
  frameTitle: (provider) =>
    Object.hasOwn(PROVIDER_FRAMES, provider) ? PROVIDER_FRAMES[provider] : `Incorporação do ${provider}`,
  linkOptions: 'Opções do link',
  keepAsLink: 'Manter como link',
  embedLink: 'Link para incorporar',
  bookmarkLink: 'Link para o favorito',
  notALink: 'Digite um endereço da web, por exemplo https://exemplo.com',
  cannotEmbed: 'Este link não pode ser incorporado.',
  bookmarkInstead: 'Criar um favorito em vez disso',
};
