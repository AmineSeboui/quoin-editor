const TOKEN = /<!--[\s\S]*?-->|<(\/?)([A-Za-z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*\/?>|[^<]+/g;
const ATTRIBUTE = /([^\s=>/]+)(?:="([^"]*)")?/g;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" };

const decode = (value: string): string => value.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, name: string) => ENTITIES[name]);
const encode = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function attributes(source: string): string[] {
  return [...source.matchAll(ATTRIBUTE)].map(([, name, value = '']) => `${name.toLowerCase()}="${encode(decode(value))}"`).sort();
}

/**
 * The HTML in one spelling: attributes sorted and quoted, entities written one way, void tags without a slash, text
 * runs joined, comments dropped. React writes the resource hints it hoists as preload links, which are not the
 * document's, so those are dropped too.
 */
export function canonicalHtml(html: string): string {
  const out: string[] = [];
  for (const [token, closing, name, attrs] of html.matchAll(TOKEN)) {
    if (token.startsWith('<!--')) continue;
    if (name === undefined) {
      const text = encode(decode(token));
      if (out.length > 0 && !out[out.length - 1].startsWith('<')) out[out.length - 1] += text;
      else out.push(text);
      continue;
    }
    const written = attributes(attrs);
    if (name.toLowerCase() === 'link' && written.includes('rel="preload"')) continue;
    out.push(closing ? `</${name.toLowerCase()}>` : `<${[name.toLowerCase(), ...written].join(' ')}>`);
  }
  return out.join('');
}
