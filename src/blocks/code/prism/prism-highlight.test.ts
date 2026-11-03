import { highlightWith, type Tokenize } from './prism-highlight';

const spells = (lines: ReturnType<typeof highlightWith>, code: string) =>
  lines.map((line) => line.map((token) => token.text).join('')).join('\n') === code;

const never: Tokenize = () => null;
const asKeyword: Tokenize = (code) => [{ type: 'keyword', content: code }];

describe('highlightWith', () => {
  it('draws a language with no grammar as plain lines', () => {
    expect(highlightWith(never, 'a\nb', 'nosuchlanguage')).toEqual([[{ text: 'a' }], [{ text: 'b' }]]);
  });

  it('draws a block with no language as plain lines', () => {
    expect(highlightWith(asKeyword, 'plain', '')).toEqual([[{ text: 'plain' }]]);
  });

  it('draws the tokens of a known language', () => {
    expect(highlightWith(asKeyword, 'const', 'typescript')).toEqual([
      [{ text: 'const', className: 'quoin-tok-keyword' }],
    ]);
  });

  it('reads the block language through its alias', () => {
    const seen: string[] = [];
    const record: Tokenize = (code, grammar) => (seen.push(grammar), [code]);
    highlightWith(record, 'x', 'ts');
    expect(seen).toEqual(['typescript']);
  });

  it('falls back to plain lines when the grammar is missing at run time', () => {
    expect(highlightWith(never, 'x = 1', 'python')).toEqual([[{ text: 'x = 1' }]]);
  });

  it('falls back to plain lines when the tokenizer throws', () => {
    const throws: Tokenize = () => {
      throw new Error('broken grammar');
    };
    expect(highlightWith(throws, 'x = 1', 'python')).toEqual([[{ text: 'x = 1' }]]);
  });

  it.each(['', 'one line', 'a\nb\nc', 'a\n\nb', 'trailing\n'])('spells %j exactly', (code) => {
    expect(spells(highlightWith(never, code, 'python'), code)).toBe(true);
    expect(spells(highlightWith(asKeyword, code, 'python'), code)).toBe(true);
  });
});
