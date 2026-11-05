import { LABEL_SETS } from './test-support/label-sets';

type Pack = { code: string; language: string; load: () => Promise<Record<string, unknown>>; shared: readonly string[] };

/** A pack's `shared` names the paths it keeps as English on purpose, so one left untranslated fails instead. */
const PACKS: readonly Pack[] = [
  {
    code: 'fr',
    language: 'French',
    load: () => import('./fr'),
    shared: [
      'core.blockNames.code',
      'core.blockNames.image',
      'core.calloutTones.danger',
      'core.code',
      'core.codeText',
      'core.colors.orange',
      'core.keyNames.alt',
      'core.keyNames.ctrl',
      'core.namedKeys.f10',
      'core.namedKeys.tab',
      'core.shortcutGroupNames.menus',
      'core.shortcutGroupNames.navigation',
      'math.latex',
      'mention.mentionMenu',
    ],
  },
  {
    code: 'ar',
    language: 'Arabic',
    load: () => import('./ar'),
    shared: [
      'core.keyNames.alt',
      'core.keyNames.ctrl',
      'core.keyNames.shift',
      'core.namedKeys.backspace',
      'core.namedKeys.delete',
      'core.namedKeys.enter',
      'core.namedKeys.f10',
      'core.namedKeys.tab',
      'math.latex',
    ],
  },
  {
    code: 'de',
    language: 'German',
    load: () => import('./de'),
    shared: [
      'core.blockNames.code',
      'core.blockNames.text',
      'core.code',
      'core.codeText',
      'core.colors.orange',
      'core.document',
      'core.keyNames.alt',
      'core.link',
      'core.namedKeys.enter',
      'core.namedKeys.f10',
      'core.namedKeys.tab',
      'core.shortcutGroupNames.navigation',
      'core.shortcutGroupNames.text',
      'math.latex',
    ],
  },
  {
    code: 'es',
    language: 'Spanish',
    load: () => import('./es'),
    shared: [
      'core.color',
      'core.document',
      'core.keyNames.alt',
      'core.keyNames.ctrl',
      'core.namedKeys.f10',
      'core.namedKeys.tab',
      'math.latex',
    ],
  },
  {
    code: 'pt',
    language: 'Portuguese',
    load: () => import('./pt'),
    shared: [
      'core.document',
      'core.keyNames.alt',
      'core.keyNames.ctrl',
      'core.keyNames.shift',
      'core.link',
      'core.namedKeys.backspace',
      'core.namedKeys.delete',
      'core.namedKeys.enter',
      'core.namedKeys.f10',
      'core.namedKeys.tab',
      'core.shortcutGroupNames.menus',
      'math.latex',
    ],
  },
  {
    code: 'zh',
    language: 'Simplified Chinese',
    load: () => import('./zh'),
    shared: [
      'core.groups.ai',
      'core.keyNames.alt',
      'core.keyNames.ctrl',
      'core.keyNames.shift',
      'core.namedKeys.delete',
      'core.namedKeys.enter',
      'core.namedKeys.f10',
      'core.namedKeys.tab',
      'math.latex',
    ],
  },
  {
    code: 'ja',
    language: 'Japanese',
    load: () => import('./ja'),
    shared: [
      'core.groups.ai',
      'core.keyNames.alt',
      'core.keyNames.ctrl',
      'core.keyNames.shift',
      'core.namedKeys.backspace',
      'core.namedKeys.delete',
      'core.namedKeys.enter',
      'core.namedKeys.f10',
      'core.namedKeys.tab',
      'math.latex',
    ],
  },
];

/** The arguments every worded label is called with, so each pack answers them all without throwing. */
const ARGS: Readonly<Record<string, readonly (readonly unknown[])[]>> = {
  'core.heading': [[1], [2], [3]],
  'core.numberedItem': [[1], [3]],
  'core.callout': [['info']],
  'core.calloutToneMenu': [['info']],
  'core.toggleButton': [[0], [1], [2], [11]],
  'core.placeholderHeading': [[2]],
  'core.blockMenu': [['Text']],
  'core.resultCount': [[0], [1], [2], [11], [1234]],
  'core.blockMoved': [[2, 5]],
  'core.blockInserted': [[2, 5]],
  'core.blockDeleted': [[1], [2], [11]],
  'core.blocksSelected': [[1], [2], [11]],
  'core.undoHint': [['Ctrl+Z']],
  'core.keySequence': [['Escape', 'Tab']],
  'core.keyAlternative': [['Escape', 'Tab']],
  'core.editBlock': [['Image']],
  'core.uploaded': [['photo.png']],
  'core.widthValue': [[50]],
  'core.downloadFile': [['notes.txt']],
  'core.fileSize': [[0], [512], [1536], [1_048_576]],
  'core.fileBlockName': [['notes.txt']],
  'core.codeBlockName': [['TypeScript']],
  'ai.ask': [['Summarize']],
  'ai.written': [['An answer']],
  'ai.halted': [['An answer']],
  'comments.showComments': [[0], [1], [2], [11]],
  'comments.thread': [['the text']],
  'comments.commentCount': [[1], [3]],
  'comments.postedAt': [['2026-01-02T10:30:00Z'], ['not a date']],
  'diagram.diagram': [['mermaid']],
  'diff.changed': [[[]], [['type', 'indent']], [['nothing named']]],
  'embed.frameTitle': [['youtube'], ['example.com']],
  'find.matchCount': [
    [1, 10, false],
    [1, 1000, true],
  ],
  'mention.mentionDescription': [[undefined], ['person']],
  'presence.joined': [[['Ada']], [['Ada', 'Alan']]],
  'presence.left': [[['Ada']], [['Ada', 'Alan']]],
  'presence.here': [[['Ada']], [['Ada', 'Alan', 'Grace']]],
  'presence.caret': [['Ada']],
  'stats.characters': [[0], [1], [2], [11], [1234]],
  'stats.words': [[1], [2]],
  'stats.blocks': [[1], [2]],
  'stats.characterLimit': [[10, 100]],
  'stats.limitReached': [[1000]],
  'table.cell': [[1, 2]],
  'table.rowOptions': [[1]],
  'table.columnOptions': [[2]],
  'table.insertRowAt': [[2]],
  'table.insertColumnAt': [[2]],
  'table.resizeColumn': [[2]],
  'table.columnWidth': [[240]],
  'toc.tableOfContentsNumbered': [[2]],
};

type Leaf = [path: string, value: unknown];

const leaves = (labels: object, path = ''): Leaf[] =>
  Object.entries(labels).flatMap(([key, value]): Leaf[] => {
    const here = path === '' ? key : `${path}.${key}`;
    return typeof value === 'object' && value !== null ? leaves(value as object, here) : [[here, value]];
  });

const pathsOf = (labels: object) => leaves(labels).map(([path]) => path);

const setsOf = (pack: Record<string, unknown>, code: string) =>
  LABEL_SETS.map((set) => ({ ...set, labels: pack[`${code}${set.suffix}`] as object | undefined }));

describe.each(PACKS)('the $language locale pack', ({ code, load, shared }) => {
  it('exports one set of labels for each the editor reads, and nothing else', async () => {
    const pack = await load();
    expect(Object.keys(pack).sort()).toEqual(LABEL_SETS.map((set) => `${code}${set.suffix}`).sort());
  });

  it.each(LABEL_SETS.map((set) => set.name))('covers every %s label', async (name) => {
    const pack = await load();
    const set = setsOf(pack, code).find((candidate) => candidate.name === name);
    expect(pathsOf(set?.labels ?? {}).sort()).toEqual(pathsOf(set?.english ?? {}).sort());
  });

  it('says something for every label, and for every worded one at every count', async () => {
    const pack = await load();
    const empty: string[] = [];
    for (const { name, labels } of setsOf(pack, code)) {
      for (const [path, value] of leaves(labels ?? {})) {
        const full = `${name}.${path}`;
        if (typeof value === 'string') {
          if (value.trim() === '') empty.push(full);
          continue;
        }
        const calls = ARGS[full];
        expect(calls, `${full} is a worded label with no arguments in ARGS`).toBeDefined();
        for (const args of calls ?? []) {
          const said = (value as (...given: readonly unknown[]) => unknown)(...args);
          if (typeof said !== 'string' || said.trim() === '') empty.push(`${full}(${args.join(', ')})`);
        }
      }
    }
    expect(empty).toEqual([]);
  });

  it('translates every label it does not share with English on purpose', async () => {
    const pack = await load();
    const untranslated: string[] = [];
    for (const { name, labels, english } of setsOf(pack, code)) {
      const written = new Map(leaves(english).map(([path, value]) => [path, value]));
      for (const [path, value] of leaves(labels ?? {})) {
        const full = `${name}.${path}`;
        if (typeof value === 'string' && value === written.get(path) && !shared.includes(full)) untranslated.push(full);
      }
    }
    expect(untranslated).toEqual([]);
  });

  it('keeps nothing in the shared list that it has since translated', async () => {
    const pack = await load();
    const written = new Map(
      setsOf(pack, code).flatMap(({ name, labels, english }) => {
        const english_ = new Map(leaves(english));
        return leaves(labels ?? {}).map(([path, value]): [string, boolean] => [
          `${name}.${path}`,
          value === english_.get(path),
        ]);
      }),
    );
    expect(shared.filter((path) => written.get(path) !== true)).toEqual([]);
  });
});
