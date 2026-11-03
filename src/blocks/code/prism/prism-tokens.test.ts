import { codeLines } from './prism-tokens';

const text = (lines: ReturnType<typeof codeLines>) => lines.map((line) => line.map((token) => token.text).join('')).join('\n');

describe('codeLines', () => {
  it('draws text outside a token with no class', () => {
    expect(codeLines(['plain'])).toEqual([[{ text: 'plain' }]]);
  });

  it('names a token by its type', () => {
    expect(codeLines([{ type: 'keyword', content: 'const' }])).toEqual([[{ text: 'const', className: 'quoin-tok-keyword' }]]);
  });

  it('names a nested token by the innermost type', () => {
    const nested = { type: 'string', content: [{ type: 'interpolation', content: '${x}' }] };
    expect(codeLines([nested])).toEqual([[{ text: '${x}', className: 'quoin-tok-interpolation' }]]);
  });

  it('splits a token that spans lines, keeping its class on each part', () => {
    expect(codeLines([{ type: 'comment', content: '/* one\ntwo */' }])).toEqual([
      [{ text: '/* one', className: 'quoin-tok-comment' }],
      [{ text: 'two */', className: 'quoin-tok-comment' }],
    ]);
  });

  it('splits plain text that spans lines', () => {
    expect(codeLines(['a\nb'])).toEqual([[{ text: 'a' }], [{ text: 'b' }]]);
  });

  it('gives a blank line no tokens', () => {
    expect(codeLines(['a\n\nb'])).toEqual([[{ text: 'a' }], [], [{ text: 'b' }]]);
  });

  it('spells the source exactly across tokens, nesting and line breaks', () => {
    const nodes = [
      { type: 'keyword', content: 'const' },
      ' x = ',
      { type: 'string', content: ['`hi ', { type: 'interpolation', content: '${n}' }, '`'] },
      ';\n',
      { type: 'comment', content: '// done' },
    ];
    expect(text(codeLines(nodes))).toBe('const x = `hi ${n}`;\n// done');
  });

  it('takes an alias over the type when one is given', () => {
    expect(codeLines([{ type: 'punctuation', content: '{', alias: 'brace' }])).toEqual([
      [{ text: '{', className: 'quoin-tok-brace' }],
    ]);
  });

  it('leaves out a type that is not a plain word, rather than writing it into a class', () => {
    expect(codeLines([{ type: 'a b"c', content: 'x' }])).toEqual([[{ text: 'x' }]]);
  });
});
