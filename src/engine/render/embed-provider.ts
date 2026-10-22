/** The parts of a URL that a provider reads. A WHATWG `URL` fits, and the declarations need no DOM types. */
export type EmbedUrl = {
  readonly href: string;
  readonly protocol: string;
  readonly hostname: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly searchParams: { get(name: string): string | null };
};

export type EmbedProvider = {
  readonly name: string;
  /** Returns the https address of the frame for a page this provider embeds, or null for any other page. */
  match(url: EmbedUrl): string | null;
};

/** The attributes every embedded frame carries, on the canvas and in exported HTML, by their HTML names. */
export const EMBED_FRAME = {
  sandbox: 'allow-scripts allow-same-origin allow-presentation allow-popups',
  loading: 'lazy',
  referrerpolicy: 'strict-origin-when-cross-origin',
} as const;

const WEB = new Set(['http:', 'https:']);
const SECURE = new Set(['https:']);

function parse(address: string): URL | null {
  try {
    return new URL(address);
  } catch {
    return null;
  }
}

function plainWebUrl(address: string, protocols: ReadonlySet<string>): URL | null {
  const url = parse(address);
  return url && protocols.has(url.protocol) && url.username === '' && url.password === '' && url.port === '' ? url : null;
}

/** The https frame of a page and the name of the provider that frames it, or null when none does. */
export function embedFrame(href: string, providers: readonly EmbedProvider[]): { src: string; name: string } | null {
  const page = plainWebUrl(href, WEB);
  if (!page) return null;
  for (const provider of providers) {
    const result = provider.match(page);
    const frame = typeof result === 'string' ? plainWebUrl(result, SECURE) : null;
    if (frame) return { src: frame.href, name: provider.name };
  }
  return null;
}
