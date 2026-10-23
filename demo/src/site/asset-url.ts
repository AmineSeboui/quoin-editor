import { BASE } from './site';

/** The address of a picture or file the site's own demos store, served from the site's public folder. */
export const resolveAssetUrl = (storageKey: string) => `${BASE}${storageKey}`;
