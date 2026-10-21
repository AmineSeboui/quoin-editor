import fc from 'fast-check';
import { coreExtensions, parseInline } from '../../engine';
import { caret, md, startEditor } from '../../engine/test-support/editor-fixtures';
import { inlineLength } from '../../engine/model/inline';
import { mathExtension } from './math-extension';

type Chunk = { readonly kind: 'plain' | 'code' | 'link'; readonly text: string };

const chars = (...units: string[]) => fc.string({ unit: fc.constantFrom(...units), minLength: 1, maxLength: 5 });
const filled = (value: string) => value.trim() !== '';
const chunk: fc.Arbitrary<Chunk> = fc.oneof(
  chars('a', 'b', '1', ' ', '$').map((text) => ({ kind: 'plain' as const, text })),
  chars('a', '$', ' ').filter(filled).map((text) => ({ kind: 'code' as const, text })),
  chars('a', '1', ' ', '$').filter(filled).map((text) => ({ kind: 'link' as const, text })),
);
// Two links side by side to one address are one link to the editor, so they are generated as one.
function joinLinks(chunks: readonly Chunk[]): Chunk[] {
  return chunks.reduce<Chunk[]>((joined, next) => {
    const last = joined.at(-1);
    if (last?.kind !== 'link' || next.kind !== 'link') return [...joined, next];
    return [...joined.slice(0, -1), { kind: 'link', text: last.text + next.text }];
  }, []);
}

// The line ends in plain text, where the closing dollar is typed.
const line = fc
  .array(chunk, { minLength: 1, maxLength: 5 })
  .map(joinLinks)
  .map((chunks) => (chunks.at(-1)?.kind === 'plain' ? chunks : [...chunks, { kind: 'plain' as const, text: 'a' }]));

const escapeDollars = (value: string) => value.replace(/\$/g, '\\$');

// As the writer would type it, every dollar outside code live, and as the editor holds it, every such dollar text.
function markdownOf(chunks: readonly Chunk[], dollars: (value: string) => string): string {
  return chunks
    .map(({ kind, text }) => (kind === 'code' ? `\`${text}\`` : kind === 'link' ? `[${dollars(text)}](https://a.b)` : dollars(text)))
    .join('');
}

function typedDollar(stored: string) {
  const { editor } = startEditor([md('p', stored)], { extensions: [...coreExtensions(), mathExtension()] });
  editor.commands.setSelection(caret('p', inlineLength(editor.state.doc.blocks[0].regions.text)));
  editor.insertText('$');
  return editor.state.doc.blocks[0].regions.text;
}

const latexOf = (node: ReturnType<typeof parseInline>[number] | undefined) =>
  node?.kind === 'atom' ? (node.attrs.latex ?? '') : null;

describe('the inline math input rule, on generated lines of text, code spans and links', () => {
  it('converts exactly the formula the markdown parser reads at the typed dollar, and none that crosses code or a link', () => {
    fc.assert(
      fc.property(line, (chunks) => {
        const live = markdownOf(chunks, (value) => value);
        fc.pre(!/^\s|\s$/.test(live) && !parseInline(live).some((node) => node.kind === 'atom'));
        const read = latexOf(parseInline(`${live}$`).at(-1));
        const expected = read !== null && !/[`[\]]/.test(read) ? read : null;
        expect(latexOf(typedDollar(markdownOf(chunks, escapeDollars)).at(-1))).toBe(expected);
      }),
      { seed: 20261020, numRuns: 3000 },
    );
  });
});
