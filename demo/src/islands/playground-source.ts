import { SET_SUFFIX } from './playground-languages';

export type Settings = { language: string; highlighting: boolean; source: boolean; readOnly: boolean };

const SHOWN_FEATURES = ['table', 'find'] as const;

const localeImport = (language: string, source: boolean): string => {
  const names = ['core' as const, ...SHOWN_FEATURES, ...(source ? (['source'] as const) : [])]
    .map((set) => `${language}${SET_SUFFIX[set]}`)
    .sort();
  return `import { ${names.join(', ')} } from 'quoin-editor/locale-${language}';`;
};

/** The tsx this page is passing right now, for a reader to copy into their own editor. */
export function playgroundSource({ language, highlighting, source, readOnly }: Settings): string {
  const translated = language !== 'en';
  const labelled = (set: keyof typeof SET_SUFFIX) => (translated ? `${language}${SET_SUFFIX[set]}` : null);

  const imports = [`import { BlockCanvas } from 'quoin-editor';`, `import { catalogue } from 'quoin-editor/catalogue';`];
  if (highlighting) imports.push(`import { usePrismHighlighter } from 'quoin-editor/highlight';`);
  if (translated) imports.push(localeImport(language, source));
  if (source) imports.push(`import { QuoinSource } from 'quoin-editor/source';`);

  const features = SHOWN_FEATURES.map((set) => `  ${set}: { labels: ${labelled(set)} },`);
  const extensions = translated
    ? ['const extensions = catalogue({', ...features, '  // every other feature the same way, through its own options', '});']
    : ['const extensions = catalogue();'];

  const props = [
    `  key="${language}"`,
    '  blocks={blocks}',
    '  onChange={setBlocks}',
    '  extensions={extensions}',
    translated ? `  labels={${labelled('core')}}` : null,
    highlighting ? '  highlight={usePrismHighlighter()}' : null,
    readOnly ? '  readOnly' : null,
  ].filter((line) => line !== null);

  const pane = source
    ? ['', `<QuoinSource controller={handle.controller}${translated ? ` labels={${labelled('source')}}` : ''} />`]
    : [];

  return [...imports, '', ...extensions, '', '<BlockCanvas', ...props, '/>', ...pane].join('\n');
}
