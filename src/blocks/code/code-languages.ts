export type CodeLanguage = { readonly id: string; readonly name: string; readonly aliases?: readonly string[] };

const language = (name: string, id = name.toLowerCase(), ...aliases: string[]): CodeLanguage => ({ id, name, aliases });

// The names are proper nouns, the same in every language, so they are data rather than labels. Each id is the name a
// markdown fence and the common highlighters know the language by.
export const CODE_LANGUAGES: readonly CodeLanguage[] = [
  language('Bash', 'bash', 'sh'),
  language('C'),
  language('C++', 'cpp', 'c++'),
  language('C#', 'csharp', 'cs'),
  language('CSS'),
  language('Dart'),
  language('Diff'),
  language('Dockerfile', 'dockerfile', 'docker'),
  language('Elixir'),
  language('Go', 'go', 'golang'),
  language('GraphQL'),
  language('Haskell'),
  language('HTML'),
  language('Java'),
  language('JavaScript', 'javascript', 'js'),
  language('JSON'),
  language('JSX'),
  language('Kotlin', 'kotlin', 'kt'),
  language('LaTeX', 'latex', 'tex'),
  language('Lua'),
  language('Makefile'),
  language('Markdown', 'markdown', 'md'),
  language('MATLAB'),
  language('Perl'),
  language('PHP'),
  language('PowerShell', 'powershell', 'ps1'),
  language('Python', 'python', 'py'),
  language('R'),
  language('Ruby', 'ruby', 'rb'),
  language('Rust', 'rust', 'rs'),
  language('Scala'),
  language('SCSS'),
  language('Shell'),
  language('SQL'),
  language('Swift'),
  language('TOML'),
  language('TSX'),
  language('TypeScript', 'typescript', 'ts'),
  language('XML'),
  language('YAML', 'yaml', 'yml'),
];

const knows = ({ id, aliases = [] }: CodeLanguage, key: string): boolean => id === key || aliases.includes(key);

export function languageName(language: string): string | undefined {
  const key = language.toLowerCase();
  return CODE_LANGUAGES.find((known) => knows(known, key))?.name;
}

/** What the block stores for a language typed in: the id of a language named as listed, else the text as typed. */
export function languageId(typed: string): string {
  const text = typed.trim();
  return CODE_LANGUAGES.find(({ name }) => name.toLowerCase() === text.toLowerCase())?.id ?? text;
}

export function languageOptions(query: string, plainText: string): CodeLanguage[] {
  const key = query.trim().toLowerCase();
  const matches = ({ id, name, aliases = [] }: CodeLanguage) =>
    name.toLowerCase().includes(key) || [id, ...aliases].some((known) => known.startsWith(key));
  return [{ id: '', name: plainText }, ...CODE_LANGUAGES].filter(matches);
}
