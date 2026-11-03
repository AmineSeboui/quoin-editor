import { CODE_LANGUAGES } from '../code-languages';
import { grammarName } from './grammar-name';
import { highlightWith } from './prism-highlight';
import { tokenize } from './prism-grammars';

const drawn = (code: string, language: string) => highlightWith(tokenize, code, language);
const spelled = (code: string, language: string) =>
  drawn(code, language)
    .map((line) => line.map((token) => token.text).join(''))
    .join('\n');
const classes = (code: string, language: string) =>
  new Set(drawn(code, language).flatMap((line) => line.map((token) => token.className).filter(Boolean)));

describe('tokenize', () => {
  it('loads a grammar for every listed language', () => {
    const missing = CODE_LANGUAGES.filter(({ id }) => tokenize('x', grammarName(id) ?? '') === null);
    expect(missing.map(({ id }) => id)).toEqual([]);
  });

  it('gives no tokens for a grammar it does not know', () => {
    expect(tokenize('x', 'nosuchgrammar')).toBeNull();
  });

  const samples: [string, string][] = [
    ['typescript', 'const x: number = 1; // one'],
    ['python', 'def f(n):\n    """doc"""\n    return n + 1'],
    ['rust', 'fn main() {\n    println!("hi");\n}'],
    ['go', 'func main() {\n\t// go\n\tx := `raw`\n}'],
    ['bash', 'echo "$HOME" | grep -c . # count'],
    ['json', '{\n  "a": [1, 2],\n  "b": null\n}'],
    ['yaml', 'a: 1\nb:\n  - x\n  - y'],
    ['html', '<a href="#x">link</a>'],
    ['xml', '<root><item id="1" /></root>'],
    ['dockerfile', 'FROM node:22\nRUN npm ci'],
    ['shell', 'ls -la | wc -l'],
    ['css', '.a { color: red; /* c */ }'],
    ['sql', 'SELECT a FROM t WHERE b = 1;'],
    ['markdown', '# Title\n\nSome **bold** text.'],
    ['diff', '+ added\n- removed'],
  ];

  it.each(samples)('spells %s exactly', (language, code) => {
    expect(spelled(code, language)).toBe(code);
  });

  it.each(samples)('finds tokens to draw in %s', (language, code) => {
    expect(classes(code, language).size).toBeGreaterThan(0);
  });

  it('keeps a comment that spans lines on each of its lines', () => {
    const lines = drawn('/* one\ntwo */', 'css');
    expect(lines).toHaveLength(2);
    expect(lines.every((line) => line.every((token) => token.className === 'quoin-tok-comment'))).toBe(true);
  });

  it('spells code holding only a language keyword exactly', () => {
    expect(spelled('const', 'typescript')).toBe('const');
  });
});
