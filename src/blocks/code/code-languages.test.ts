import { CODE_LANGUAGES, languageId, languageName, languageOptions } from './code-languages';

describe('the code languages', () => {
  it('are forty, each with a distinct name and a distinct lower-case id', () => {
    expect(CODE_LANGUAGES).toHaveLength(40);
    expect(new Set(CODE_LANGUAGES.map(({ name }) => name)).size).toBe(40);
    for (const { id } of CODE_LANGUAGES) expect(id).toMatch(/^[a-z+#]+$/);
  });

  it('name a language by its id or one of its aliases, in any case, and nothing else', () => {
    expect(languageName('typescript')).toBe('TypeScript');
    expect(languageName('ts')).toBe('TypeScript');
    expect(languageName('PY')).toBe('Python');
    expect(languageName('cobol')).toBeUndefined();
    expect(languageName('')).toBeUndefined();
  });

  it('store a known name as its id, and anything else as typed without the spaces around it', () => {
    expect(languageId('TypeScript')).toBe('typescript');
    expect(languageId(' c++ ')).toBe('cpp');
    expect(languageId(' Cobol ')).toBe('Cobol');
    expect(languageId('ts')).toBe('ts');
  });
});

describe('languageOptions', () => {
  it('offers plain text, then every language, for an empty query', () => {
    const options = languageOptions('', 'Plain text');
    expect(options[0]).toEqual({ id: '', name: 'Plain text' });
    expect(options).toHaveLength(41);
  });

  it('keeps the options whose name contains the query or whose id or alias starts with it', () => {
    expect(languageOptions('script', 'Plain text').map(({ name }) => name)).toEqual(['JavaScript', 'TypeScript']);
    expect(languageOptions('ts', 'Plain text').map(({ name }) => name)).toEqual(['TSX', 'TypeScript']);
    expect(languageOptions('PLAIN', 'Plain text').map(({ name }) => name)).toEqual(['Plain text']);
    expect(languageOptions('cobol', 'Plain text')).toEqual([]);
  });
});
