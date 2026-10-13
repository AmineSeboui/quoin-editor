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

export function embedSource(href: string, providers: readonly EmbedProvider[]): string | null {
  const page = plainWebUrl(href, WEB);
  if (!page) return null;
  for (const provider of providers) {
    const result = provider.match(page);
    const frame = typeof result === 'string' ? plainWebUrl(result, SECURE) : null;
    if (frame) return frame.href;
  }
  return null;
}
