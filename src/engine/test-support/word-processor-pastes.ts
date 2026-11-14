import type { QuoinBlock } from '../model/quoin-block';

/** A block as a line of markdown indented by its depth, or its type and data when it holds no markdown. */
export const pasteShape = ({ type, data, indent }: QuoinBlock): unknown =>
  type === 'MARKDOWN' ? '  '.repeat(indent ?? 0) + String(data.markdown) : { type, ...data };

const table = (rows: string[][], header = false) => ({
  type: 'TABLE',
  rows,
  header,
  align: Array<null>(rows[0].length).fill(null),
});

const OPENING = 'An opening paragraph with **bold**, _italic_, <u>underlined</u>, ~~struck~~ and `code` words.';
const GOALS = ['- Ship the editor', '  - Grow the team', '    - Hire two engineers', '- Write the docs'];
const STEPS = ['1. Draft', '2. Review', '  1. First pass', '3. Publish'];
const TASKS = ['- [ ] Book the room', '- [x] Send the invite'];
const MERGED = table([
  ['**Team and owner**', '', '**Due**'],
  ['Editor', 'Amine', 'May'],
  ['', 'Sam', 'June'],
]);
const COLOURED = 'Closing words with <span data-color="red">red text</span> and <span data-bg="yellow">highlighted</span> text.';
const CLOSING = `${COLOURED} See [the docs](https://quoin.dev/docs).`;

// The every-block document of the end to end harness, written by toDocx and copied whole in Word. Word has no callout,
// toggle, file, embed, bookmark, equation or contents block of the editor's, so those come back as the table, text and
// links Word drew them as, and the picture, which Word keeps inline, waits for an upload.
const EVERY_BLOCK_IN_WORD = [
  'Line 0',
  '# Catalogue',
  'Line 1',
  'Ask @Ada Lovelace about `x^2` \u{1F389}',
  'Line 2',
  '## Section',
  'Line 3',
  '### Subsection',
  'Line 4',
  '> Quoted words',
  'Line 5',
  { type: 'DIVIDER' },
  'Line 6',
  table([['Read this first']]),
  'Line 7',
  '- Bullet',
  'Line 8',
  '1. Numbered',
  'Line 9',
  '- [ ] Task',
  'Line 10',
  'Details',
  'Line 11',
  'Line 12',
  'notes.pdf',
  'Line 13',
  { type: 'CODE', language: '', code: 'const answer = 42;' },
  'Line 14',
  table(
    [
      ['Name', 'Role'],
      ['Ada', 'Author'],
    ],
    true,
  ),
  'Line 15',
  '<https://www.youtube.com/watch?v=dQw4w9WgXcQ>',
  'Line 16',
  '[Quoin docs](https://quoin.dev/docs)',
  'Line 17',
  '`e^{i\\pi} + 1 = 0`',
  'Line 18',
  'Catalogue',
  'Section',
  'Subsection',
  'Line 19',
];

/** Each source, the fixture its clipboard HTML is kept in, and the blocks a paste of it should give. */
export const WORD_PROCESSOR_PASTES: [source: string, fixture: string, blocks: unknown[]][] = [
  [
    'TextEdit and Pages, through the Cocoa HTML writer',
    'textedit.html',
    [
      '# Quarterly plan',
      OPENING,
      '## Goals',
      '- Ship the editor',
      '  - Grow the team',
      '- Write the docs',
      '### Steps',
      ...STEPS,
      table([
        ['**Team and owner**', '', '**Due**'],
        ['Editor', 'Amine', 'May'],
      ]),
      COLOURED,
    ],
  ],
  [
    'a Word document opened in TextEdit',
    'textedit-word-document.html',
    [
      'Quarterly plan',
      'An opening paragraph with **bold**, _italic_, <u>underlined</u>, ~~struck~~ and code words.',
      'Goals',
      ...GOALS,
      'Steps',
      '- Draft',
      '- Review',
      '  - First pass',
      '- Publish',
      ...TASKS,
      table([
        ['**Name**', '**Owner**'],
        ['Editor', 'Amine'],
        ['Docs', 'Sam'],
      ]),
      'A quoted line',
      'Closing words with <span data-color="red">red text</span> and highlighted text.',
    ],
  ],
  [
    'Microsoft Word on the desktop',
    'word-desktop.html',
    ['# Quarterly plan', OPENING, '# Goals', ...GOALS, '### Steps', ...STEPS, ...TASKS, MERGED, CLOSING],
  ],
  ['Microsoft Word for Mac', 'word-mac-real.html', EVERY_BLOCK_IN_WORD],
  [
    'Microsoft Word on the web',
    'word-online.html',
    [
      '# Quarterly plan',
      OPENING,
      '# <span data-color="green">Goals</span>',
      ...GOALS,
      '### <span data-color="green">Steps</span>',
      ...STEPS,
      MERGED,
      CLOSING,
    ],
  ],
  [
    'Google Docs',
    'google-docs-document.html',
    [
      '# Quarterly plan',
      OPENING,
      '# Goals',
      ...GOALS,
      '### Steps',
      ...STEPS,
      '- [ ] Book the room',
      '- [x] ~~Send the invite~~',
      MERGED,
      {
        type: 'IMAGE',
        storageKey: '',
        alt: '',
        url: 'https://lh7-rt.googleusercontent.com/docsz/AD_4nXdQ0quoinFixture?key=q8mPk0Example',
      },
      CLOSING,
    ],
  ],
  [
    'LibreOffice Writer',
    'libreoffice-writer.html',
    ['# Quarterly plan', OPENING, '## Goals', ...GOALS, '### Steps', ...STEPS, ...TASKS, MERGED, CLOSING],
  ],
  [
    'Notion',
    'notion-page.html',
    [
      '# Quarterly plan',
      'An opening paragraph with **bold**, _italic_, ~~struck~~ and `code` words.',
      '## Goals',
      ...GOALS,
      '### Steps',
      ...STEPS,
      ...TASKS,
      table(
        [
          ['Team', 'Owner'],
          ['Editor', 'Amine'],
          ['Docs', 'Sam'],
        ],
        true,
      ),
      { type: 'TOGGLE', markdown: 'Open questions', open: false },
      '  Who reviews the docs?',
      '> Ship small, ship often.',
      { type: 'CODE', language: 'javascript', code: "const plan = 'quarterly';" },
      {
        type: 'IMAGE',
        storageKey: '',
        alt: 'Roadmap',
        url: 'https://prod-files-secure.s3.us-west-2.amazonaws.com/5a1f0c2e-quoin/fixture/roadmap.png',
      },
      'See [the docs](https://quoin.dev/docs).',
    ],
  ],
];
