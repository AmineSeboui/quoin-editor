import { CODE_LANGUAGES } from '../code-languages';
import { grammarName } from './grammar-name';

describe('grammarName', () => {
  it.each(['typescript', 'python', 'rust', 'yaml', 'markdown', 'makefile', 'latex'])('keeps %s as it is', (id) => {
    expect(grammarName(id)).toBe(id);
  });

  it.each([
    ['ts', 'typescript'],
    ['py', 'python'],
    ['rb', 'ruby'],
    ['sh', 'bash'],
    ['golang', 'go'],
    ['c++', 'cpp'],
  ])('reads the alias %s as %s', (alias, grammar) => {
    expect(grammarName(alias)).toBe(grammar);
  });

  it.each([
    ['dockerfile', 'docker'],
    ['html', 'markup'],
    ['xml', 'markup'],
    ['shell', 'bash'],
  ])('maps %s onto the nearest grammar, %s', (id, grammar) => {
    expect(grammarName(id)).toBe(grammar);
  });

  it('ignores case', () => {
    expect(grammarName('TypeScript')).toBe('typescript');
    expect(grammarName('TS')).toBe('typescript');
  });

  it.each(['', '   ', 'nosuchlanguage'])('gives no grammar for %j', (language) => {
    expect(grammarName(language)).toBeUndefined();
  });

  it('gives every listed language a grammar', () => {
    const without = CODE_LANGUAGES.filter(({ id }) => grammarName(id) === undefined);
    expect(without).toEqual([]);
  });
});
