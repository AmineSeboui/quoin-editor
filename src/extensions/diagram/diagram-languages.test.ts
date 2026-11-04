import { DEFAULT_DIAGRAM_LANGUAGES, isDiagramLanguage } from './diagram-languages';

describe('isDiagramLanguage', () => {
  const languages = ['mermaid', 'plantuml'];

  it.each(['mermaid', 'plantuml'])('knows %s when it is configured', (language) => {
    expect(isDiagramLanguage(languages, language)).toBe(true);
  });

  it('ignores case and surrounding space, as a fence info string may carry either', () => {
    expect(isDiagramLanguage(languages, '  Mermaid ')).toBe(true);
  });

  it.each(['python', 'js', '', '   '])('leaves %j to the code block', (language) => {
    expect(isDiagramLanguage(languages, language)).toBe(false);
  });

  it('knows nothing when no language is configured', () => {
    expect(isDiagramLanguage([], 'mermaid')).toBe(false);
  });

  it('matches a configured language written in capitals', () => {
    expect(isDiagramLanguage(['Mermaid'], 'mermaid')).toBe(true);
  });

  it('offers mermaid as the default, and nothing a code block already draws', () => {
    expect(DEFAULT_DIAGRAM_LANGUAGES).toEqual(['mermaid']);
  });
});
