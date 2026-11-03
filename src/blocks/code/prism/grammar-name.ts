import { CODE_LANGUAGES } from '../code-languages';

// The listed languages Prism draws with a grammar under another name.
const NEAREST: Record<string, string> = { dockerfile: 'docker', html: 'markup', xml: 'markup', shell: 'bash' };

/** The Prism grammar for a block's language, as stored, which may be an alias such as `ts`; undefined for plain text. */
export function grammarName(language: string): string | undefined {
  const key = language.trim().toLowerCase();
  if (key === '') return undefined;
  const known = CODE_LANGUAGES.find(({ id, aliases = [] }) => id === key || aliases.includes(key));
  return known && (NEAREST[known.id] ?? known.id);
}
