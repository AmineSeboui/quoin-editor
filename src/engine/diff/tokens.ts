import type { Inline, InlineNode, TextNode } from '../model/types';

// A word, a whitespace run, or one other character with its combining marks, joiners and emoji modifiers.
const TOKEN = /\s+|[\p{L}\p{N}_][\p{L}\p{N}\p{M}_]*|.(?:[\p{M}\p{Emoji_Modifier}]|\u{200D}.)*/gsu;
const UNSPACED = /\p{L}/u;

let segmenter: Intl.Segmenter | undefined;

// Scripts written without spaces are split into words by the runtime's dictionaries, where it has them.
function words(part: string): string[] {
  if (!UNSPACED.test(part) || !Intl.Segmenter) return [part];
  segmenter ??= new Intl.Segmenter([], { granularity: 'word' });
  return Array.from(segmenter.segment(part), ({ segment }) => segment);
}

export function tokenize(inline: Inline): InlineNode[] {
  return inline.flatMap((node): InlineNode[] => {
    if (node.kind === 'atom') return [node];
    return (node.text.match(TOKEN) ?? [])
      .flatMap(words)
      .map((part): TextNode => ({ kind: 'text', text: part, marks: node.marks }));
  });
}
