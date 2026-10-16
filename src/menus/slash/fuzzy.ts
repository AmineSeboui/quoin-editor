type Searchable = { title: string; keywords?: readonly string[] };

const WORD_START = /(?:^|[\s\-_/])(\S)/g;

function isSubsequence(query: string, text: string): boolean {
  let found = 0;
  for (const character of text) {
    if (character === query[found]) found += 1;
    if (found === query.length) return true;
  }
  return false;
}

function startsAWord(query: string, title: string): boolean {
  for (const match of title.matchAll(WORD_START)) {
    if (title.startsWith(query, match.index + match[0].length - 1)) return true;
  }
  return false;
}

function score({ title, keywords = [] }: Searchable, query: string): number {
  const text = title.toLowerCase();
  if (startsAWord(query, text)) return 3;
  if (keywords.some((keyword) => keyword.toLowerCase().startsWith(query))) return 2;
  if (text.includes(query)) return 1;
  return isSubsequence(query, text) ? 0.5 : 0;
}

export function fuzzyFilter<T extends Searchable>(items: readonly T[], query: string): T[] {
  const wanted = query.trim().toLowerCase();
  if (wanted === '') return [...items];
  return items
    .map((item, index) => ({ item, index, score: score(item, wanted) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
