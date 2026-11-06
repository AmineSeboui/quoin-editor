import { SET_SUFFIX, type LabelSets } from './playground-languages';

export type Settings = {
  language: string;
  comments: boolean;
  ai: boolean;
  collaboration: boolean;
  highlighting: boolean;
  source: boolean;
  readOnly: boolean;
};

const SHOWN_FEATURES = ['table', 'find'] as const;

const localeSets = ({ comments, ai, collaboration, source }: Settings): (keyof LabelSets)[] => [
  'core',
  ...SHOWN_FEATURES,
  ...(comments ? (['comments'] as const) : []),
  ...(ai ? (['ai'] as const) : []),
  ...(collaboration ? (['presence'] as const) : []),
  ...(source ? (['source'] as const) : []),
];

/** The tsx this page is passing right now, for a reader to copy into their own editor. */
export function playgroundSource(settings: Settings): string {
  const { language, comments, ai, collaboration, highlighting, source, readOnly } = settings;
  const translated = language !== 'en';
  const named = (set: keyof LabelSets) => (translated ? `${language}${SET_SUFFIX[set]}` : null);
  const labelled = (set: keyof LabelSets) => (translated ? `, labels: ${named(set)}` : '');

  const imports = [
    `import { BlockCanvas } from 'quoin-editor';`,
    ai ? `import { aiExtension } from 'quoin-editor/ai';` : null,
    `import { catalogue } from 'quoin-editor/catalogue';`,
    comments ? `import { commentsExtension } from 'quoin-editor/comments';` : null,
    highlighting ? `import { usePrismHighlighter } from 'quoin-editor/highlight';` : null,
    translated
      ? `import { ${localeSets(settings)
          .map((set) => named(set))
          .sort()
          .join(', ')} } from 'quoin-editor/locale-${language}';`
      : null,
    collaboration ? `import { presenceExtension } from 'quoin-editor/presence';` : null,
    source ? `import { QuoinSource } from 'quoin-editor/source';` : null,
    collaboration ? `import { collaborationExtension, yjsCollaboration } from 'quoin-editor/yjs';` : null,
  ].filter((line) => line !== null);

  const features = SHOWN_FEATURES.map((set) => `    ${set}: { labels: ${named(set)} },`);
  const inCatalogue = translated
    ? ['  ...catalogue({', ...features, '    // every other feature the same way', '  }),']
    : ['  ...catalogue(),'];

  const extensions = [
    'const extensions = [',
    ...inCatalogue,
    comments ? `  commentsExtension({ threads, currentUser, onCreate, onReply, onResolve, onDelete${labelled('comments')} }),` : null,
    ai ? `  aiExtension({ stream: model${labelled('ai')} }),` : null,
    collaboration ? '  collaborationExtension(collaboration),' : null,
    collaboration ? `  presenceExtension(collaboration${translated ? `, { labels: ${named('presence')} }` : ''}),` : null,
    '];',
  ].filter((line) => line !== null);

  const props = [
    `  key="${language}"`,
    '  blocks={blocks}',
    '  onChange={setBlocks}',
    '  extensions={extensions}',
    translated ? `  labels={${named('core')}}` : null,
    highlighting ? '  highlight={usePrismHighlighter()}' : null,
    readOnly ? '  readOnly' : null,
  ].filter((line) => line !== null);

  const panes = [
    ...(source
      ? ['', `<QuoinSource controller={handle.controller}${translated ? ` labels={${named('source')}}` : ''} />`]
      : []),
    ...(collaboration ? ['', '// and a second canvas, with a yjsCollaboration of its own on the same channel'] : []),
  ];

  return [...imports, '', ...extensions, '', '<BlockCanvas', ...props, '/>', ...panes].join('\n');
}
