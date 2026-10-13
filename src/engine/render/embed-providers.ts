import type { EmbedProvider, EmbedUrl } from './embed-provider';

const ID = /^[\w-]{1,64}$/;
const DIGITS = /^\d{1,20}$/;
const SPOTIFY_ID = /^[A-Za-z0-9]{1,64}$/;
const SPOTIFY_KINDS = new Set(['track', 'album', 'playlist', 'episode', 'show']);
const FIGMA_KINDS = new Set(['file', 'design', 'proto', 'board']);

const pathParts = (url: EmbedUrl): string[] => url.pathname.split('/').filter((part) => part !== '');
const idFrom = (candidate: string | null | undefined, pattern: RegExp = ID): string | null =>
  candidate !== null && candidate !== undefined && pattern.test(candidate) ? candidate : null;

const youtube: EmbedProvider = {
  name: 'youtube',
  match(url) {
    const parts = pathParts(url);
    let id: string | null = null;
    if (url.hostname === 'youtu.be') {
      id = parts.length === 1 ? idFrom(parts[0]) : null;
    } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
      if (parts.length === 1 && parts[0] === 'watch') id = idFrom(url.searchParams.get('v'));
      else if (parts.length === 2 && (parts[0] === 'embed' || parts[0] === 'shorts')) id = idFrom(parts[1]);
    }
    return id === null ? null : `https://www.youtube-nocookie.com/embed/${id}`;
  },
};

const vimeo: EmbedProvider = {
  name: 'vimeo',
  match(url) {
    const parts = pathParts(url);
    let id: string | null = null;
    if (['vimeo.com', 'www.vimeo.com'].includes(url.hostname)) {
      id = parts.length === 1 ? idFrom(parts[0], DIGITS) : null;
    } else if (url.hostname === 'player.vimeo.com') {
      id = parts.length === 2 && parts[0] === 'video' ? idFrom(parts[1], DIGITS) : null;
    }
    return id === null ? null : `https://player.vimeo.com/video/${id}`;
  },
};

const loom: EmbedProvider = {
  name: 'loom',
  match(url) {
    const parts = pathParts(url);
    const onLoom = ['loom.com', 'www.loom.com'].includes(url.hostname);
    const id = onLoom && parts.length === 2 && parts[0] === 'share' ? idFrom(parts[1]) : null;
    return id === null ? null : `https://www.loom.com/embed/${id}`;
  },
};

const figma: EmbedProvider = {
  name: 'figma',
  match(url) {
    const parts = pathParts(url);
    const onFigma = ['figma.com', 'www.figma.com'].includes(url.hostname);
    if (!onFigma || parts.length < 2 || !FIGMA_KINDS.has(parts[0]) || idFrom(parts[1]) === null) return null;
    return `https://www.figma.com/embed?embed_host=quoin&url=${encodeURIComponent(url.href)}`;
  },
};

const codepen: EmbedProvider = {
  name: 'codepen',
  match(url) {
    const parts = pathParts(url);
    if (url.hostname !== 'codepen.io' || parts.length !== 3 || parts[1] !== 'pen') return null;
    const [user, , id] = parts;
    return idFrom(user) === null || idFrom(id) === null ? null : `https://codepen.io/${user}/embed/${id}`;
  },
};

const spotify: EmbedProvider = {
  name: 'spotify',
  match(url) {
    const parts = pathParts(url);
    if (url.hostname !== 'open.spotify.com' || parts.length !== 2 || !SPOTIFY_KINDS.has(parts[0])) return null;
    return idFrom(parts[1], SPOTIFY_ID) === null ? null : `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;
  },
};

const soundcloud: EmbedProvider = {
  name: 'soundcloud',
  match(url) {
    const onSoundcloud = ['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'].includes(url.hostname);
    return onSoundcloud && pathParts(url).length >= 2
      ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.href)}`
      : null;
  },
};

export const coreEmbedProviders: readonly EmbedProvider[] = [youtube, vimeo, loom, figma, codepen, spotify, soundcloud];
