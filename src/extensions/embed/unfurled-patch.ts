import { webAddress } from '../web-address';

const filled = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

/**
 * The attributes a bookmark takes from what the host's unfurl found: a title, required, then a description and a
 * picture at a web address when there are. Null for anything else.
 */
export function unfurledPatch(found: unknown): Record<string, string> | null {
  if (typeof found !== 'object' || found === null) return null;
  const { title, description, image } = found as Record<string, unknown>;
  const patch = { title: filled(title), description: filled(description), image: webAddress(image) ?? undefined };
  if (patch.title === undefined) return null;
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as Record<string, string>;
}
