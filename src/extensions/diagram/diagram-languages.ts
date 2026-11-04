/** The language a code fence names when it holds a diagram, unless the host configures its own. */
export const DEFAULT_DIAGRAM_LANGUAGES: readonly string[] = ['mermaid'];

const key = (language: string) => language.trim().toLowerCase();

/** Whether a code block's language is one the diagram extension draws, rather than one the code block highlights. */
export function isDiagramLanguage(languages: readonly string[], language: string): boolean {
  const wanted = key(language);
  return wanted !== '' && languages.some((known) => key(known) === wanted);
}
