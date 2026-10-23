import fc from 'fast-check';
import * as Y from 'yjs';

/** One thing a shared text may hold, as any writer, this one or another, could have left it. */
export type Token =
  | { kind: 'marker'; id: unknown; type: unknown; indent: unknown; attrs: Record<string, unknown> | null }
  | { kind: 'region'; name: unknown }
  | { kind: 'atom'; type: string }
  | { kind: 'embed' }
  | { kind: 'text'; value: string; bold: boolean };

const marker = fc.record({
  kind: fc.constant('marker' as const),
  id: fc.constantFrom<unknown>('a', 'b', 'c', 'd', 7),
  type: fc.constantFrom<unknown>('MARKDOWN', 'DIVIDER', undefined),
  indent: fc.constantFrom<unknown>(0, 2, 'x'),
  attrs: fc.option(fc.dictionary(fc.constantFrom('kind', 'level'), fc.constantFrom('quote', 2), { maxKeys: 2 }), {
    nil: null,
  }),
});

export const arbitraryToken: fc.Arbitrary<Token> = fc.oneof(
  { weight: 2, arbitrary: marker },
  { weight: 2, arbitrary: fc.record({ kind: fc.constant('region' as const), name: fc.constantFrom<unknown>('text', 'body', 3) }) },
  { weight: 1, arbitrary: fc.record({ kind: fc.constant('atom' as const), type: fc.constantFrom('mention', 'emoji') }) },
  { weight: 1, arbitrary: fc.constant({ kind: 'embed' as const }) },
  {
    weight: 4,
    arbitrary: fc.record({ kind: fc.constant('text' as const), value: fc.stringMatching(/^[a-z]{1,3}$/), bold: fc.boolean() }),
  },
);

/** Writes the tokens at the end of `target`, each with the formatting a careless writer might give it. */
export function writeTokens(target: Y.Text, tokens: readonly Token[]): void {
  for (const token of tokens) {
    const at = target.length;
    if (token.kind === 'text') target.insert(at, token.value, token.bold ? { bold: true } : {});
    else if (token.kind === 'region') target.insertEmbed(at, { r: token.name }, { bold: true });
    else if (token.kind === 'atom') target.insertEmbed(at, { atom: token.type, attrs: {} }, {});
    else if (token.kind === 'embed') target.insertEmbed(at, { other: 1 }, {});
    else {
      const map = new Y.Map<unknown>();
      for (const [key, value] of [['id', token.id], ['type', token.type], ['indent', token.indent]] as const) {
        if (value !== undefined) map.set(key, value);
      }
      if (token.attrs !== null) map.set('attrs', new Y.Map<unknown>(Object.entries(token.attrs)));
      target.insertEmbed(at, map, {});
    }
  }
}
