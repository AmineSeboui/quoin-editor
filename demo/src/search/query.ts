export type SearchRecord = { path: string; title: string; section?: string; id?: string; text: string };
export type Hit = { record: SearchRecord; snippet: { before: string; match: string; after: string } };

const TITLE_WEIGHT = 8;
const SECTION_WEIGHT = 5;
const TEXT_WEIGHT = 1;
const PHRASE_BONUS = 6;
const CONTEXT = 70;
const MAX_HITS = 12;

export const termsOf = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);

const countIn = (haystack: string, term: string) => {
  let found = 0;
  let at = haystack.indexOf(term);
  while (at !== -1) {
    found += 1;
    at = haystack.indexOf(term, at + term.length);
  }
  return found;
};

function score(record: SearchRecord, terms: string[], phrase: string) {
  const title = record.title.toLowerCase();
  const section = (record.section ?? '').toLowerCase();
  const text = record.text.toLowerCase();
  let total = 0;
  for (const term of terms) {
    const hits = (title.includes(term) ? TITLE_WEIGHT : 0) + (section.includes(term) ? SECTION_WEIGHT : 0);
    const inText = countIn(text, term);
    if (hits === 0 && inText === 0) return 0;
    total += hits + Math.min(inText, 3) * TEXT_WEIGHT;
  }
  if (terms.length > 1 && (text.includes(phrase) || section.includes(phrase))) total += PHRASE_BONUS;
  return total;
}

function snippetOf(record: SearchRecord, terms: string[]) {
  const text = record.text;
  const lower = text.toLowerCase();
  const term = terms.find((candidate) => lower.includes(candidate)) ?? '';
  const at = term ? lower.indexOf(term) : 0;
  const from = Math.max(0, at - CONTEXT);
  const to = Math.min(text.length, at + term.length + CONTEXT);
  return {
    before: (from > 0 ? '…' : '') + text.slice(from, at),
    match: text.slice(at, at + term.length),
    after: text.slice(at + term.length, to) + (to < text.length ? '…' : ''),
  };
}

/** The records that hold every term of the query, best first, each with the text around its first match. */
export function search(records: readonly SearchRecord[], query: string): Hit[] {
  const terms = termsOf(query);
  if (terms.length === 0) return [];
  const phrase = terms.join(' ');
  return records
    .map((record) => ({ record, points: score(record, terms, phrase) }))
    .filter(({ points }) => points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, MAX_HITS)
    .map(({ record }) => ({ record, snippet: snippetOf(record, terms) }));
}
