import type { Inline, InlineNode, TextNode } from '../model/types';

// A word, a whitespace run, or one other character with its combining marks, joiners and emoji modifiers.
const TOKEN = /\s+|[\p{L}\p{N}_][\p{L}\p{N}\p{M}_]*|.(?:[\p{M}\p{Emoji_Modifier}]|\u{200D}.)*/gsu;

export function tokenize(inline: Inline): InlineNode[] {
  return inline.flatMap((node): InlineNode[] => {
    if (node.kind === 'atom') return [node];
    return (node.text.match(TOKEN) ?? []).map((part): TextNode => ({ kind: 'text', text: part, marks: node.marks }));
  });
}
