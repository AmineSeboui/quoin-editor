import type { Locator } from '@playwright/test';
import type { QuoinBlock } from '../../src/types';

/**
 * A block type the catalogue inserts from the slash menu. `id` names it in the harness's `every` document too, where it
 * sits between two lines of text.
 */
export type CatalogueBlock = {
  id: string;
  option: string;
  query: string;
  /** The first block of an empty document once the command has run. */
  inserted?: Pick<QuoinBlock, 'type' | 'data'>;
  /** The link typed when the command asks for one. */
  link?: string;
  /** The text of the line after one undo, the slash and the query by default. */
  undone?: string;
  /** The arrow presses from inside the block to the line past it, one by default. */
  rows?: number;
  /** Whether the arrows select the block as a whole, where a block with text takes the caret and Escape selects it. */
  wholeByArrow?: boolean;
  /** Its data once ' more' is typed at the end of its text. */
  edited?: Record<string, unknown>;
  /** What a read-only canvas draws for it. */
  drawn?: (shell: Locator) => Locator;
};

const markdown = (value: string) => ({ type: 'MARKDOWN', data: { markdown: value } });

export const CATALOGUE_BLOCKS: readonly CatalogueBlock[] = [
  { id: 'text', option: 'Text', query: 'text', inserted: markdown('') },
  { id: 'heading1', option: 'Heading 1', query: 'h1', inserted: markdown('# ') },
  {
    id: 'heading2',
    option: 'Heading 2',
    query: 'h2',
    inserted: markdown('## '),
    edited: { markdown: '## Section more' },
    drawn: (shell) => shell.getByRole('heading', { level: 2, name: 'Section' }),
  },
  {
    id: 'heading3',
    option: 'Heading 3',
    query: 'h3',
    inserted: markdown('### '),
    edited: { markdown: '### Subsection more' },
    drawn: (shell) => shell.getByRole('heading', { level: 3, name: 'Subsection' }),
  },
  {
    id: 'quote',
    option: 'Quote',
    query: 'quote',
    inserted: markdown('> '),
    drawn: (shell) => shell.locator('.quoin-quote').getByRole('textbox', { name: 'Quote' }).filter({ hasText: 'Quoted words' }),
  },
  { id: 'divider', option: 'Divider', query: 'divider', wholeByArrow: true },
  { id: 'callout', option: 'Callout', query: 'callout' },
  {
    id: 'bulletedList',
    option: 'Bulleted list',
    query: 'bul',
    drawn: (shell) => shell.getByRole('textbox', { name: 'Bullet list item' }).filter({ hasText: 'Bullet' }),
  },
  {
    id: 'numberedList',
    option: 'Numbered list',
    query: 'numbered',
    inserted: markdown('1. '),
    edited: { markdown: '1. Numbered more' },
    drawn: (shell) => shell.getByRole('textbox', { name: 'Numbered list item 1' }).filter({ hasText: 'Numbered' }),
  },
  { id: 'todoList', option: 'To-do list', query: 'todo', inserted: markdown('- [ ] ') },
  {
    id: 'toggle',
    option: 'Toggle',
    query: 'toggle',
    inserted: { type: 'TOGGLE', data: { markdown: '', open: true } },
    edited: { markdown: 'Details more', open: true },
  },
  {
    id: 'image',
    option: 'Image',
    query: 'image',
    wholeByArrow: true,
    drawn: (shell) => shell.getByRole('img', { name: 'A red square' }),
  },
  { id: 'file', option: 'File', query: 'file', wholeByArrow: true },
  { id: 'code', option: 'Code', query: 'code', wholeByArrow: true },
  {
    id: 'table',
    option: 'Table',
    query: 'table',
    inserted: { type: 'TABLE', data: { rows: Array(3).fill(['', '', '']), header: true, align: [null, null, null] } },
    rows: 2,
  },
  { id: 'embed', option: 'Embed', query: 'embed', wholeByArrow: true },
  {
    id: 'bookmark',
    option: 'Bookmark',
    query: 'bookmark',
    link: 'quoin.dev/docs',
    inserted: {
      type: 'BOOKMARK',
      data: { url: 'https://quoin.dev/docs', title: 'Unfurled quoin.dev', description: 'Found by the host' },
    },
    undone: '',
    wholeByArrow: true,
  },
  { id: 'blockEquation', option: 'Block equation', query: 'blockeq', wholeByArrow: true },
  { id: 'tableOfContents', option: 'Table of contents', query: 'toc', inserted: { type: 'TOC', data: {} }, wholeByArrow: true },
];
