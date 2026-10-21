import type { MentionResult } from './mention-feature';

const MAX_RESULTS = 50;

const isText = (value: unknown): value is string => typeof value === 'string';

/** What tells two results apart, and names each option of the menu. */
export const resultKey = ({ id, kind }: MentionResult): string => JSON.stringify([kind ?? null, id]);

// A field the menu draws or the mention stores is kept only as a string, which is all either can take.
function resultOf(value: unknown): MentionResult | null {
  const { id, label, kind, description, avatarUrl } = (value ?? {}) as Partial<Record<keyof MentionResult, unknown>>;
  if (!isText(id) || !isText(label) || label.trim() === '') return null;
  return {
    id,
    label,
    ...(isText(kind) && { kind }),
    ...(isText(description) && { description }),
    ...(isText(avatarUrl) && { avatarUrl }),
  };
}

/**
 * The results of a host's answer that the menu can draw and insert: those with a string id and a label that is not
 * blank, rebuilt from their string fields, the first of each kind and id, at most 50.
 */
export function mentionResults(answer: unknown): readonly MentionResult[] {
  if (!Array.isArray(answer)) return [];
  const seen = new Set<string>();
  const results: MentionResult[] = [];
  for (const value of answer) {
    const result = resultOf(value);
    if (result === null || seen.has(resultKey(result))) continue;
    seen.add(resultKey(result));
    results.push(result);
    if (results.length === MAX_RESULTS) break;
  }
  return results;
}
