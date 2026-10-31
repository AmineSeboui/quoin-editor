import type { Inline, InlineNode, TextNode } from '../model/types';

// A word, a whitespace run, or one other character with its combining marks, joiners and emoji modifiers.
const TOKEN = /\s+|[\p{L}\p{N}_][\p{L}\p{N}\p{M}_]*|.(?:[\p{M}\p{Emoji_Modifier}]|\u{200D}.)*/gsu;
// Thai, kana and CJK ideographs, written without spaces between words.
const UNSPACED = /[\u0E00-\u0E7F\u3040-\u9FFF]/;

export function tokenize(inline: Inline): InlineNode[] {
  const words = Intl.Segmenter && new Intl.Segmenter([], { granularity: 'word' });
  const split = (part: string) =>
    UNSPACED.test(part) && words ? Array.from(words.segment(part), ({ segment }) => segment) : [part];
  return inline.flatMap((node): InlineNode[] => {
    if (node.kind === 'atom') return [node];
    return (node.text.match(TOKEN) ?? [])
      .flatMap(split)
      .map((part): TextNode => ({ kind: 'text', text: part, marks: node.marks }));
  });
}
