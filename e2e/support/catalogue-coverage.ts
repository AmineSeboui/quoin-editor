import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CATALOGUE_BLOCKS, type CatalogueBlock } from './catalogue-blocks';

export type Requirement = 'insert' | 'edit' | 'arrows' | 'undo' | 'readOnly' | 'axeWhole' | 'axeEditing';

/** A test in another spec, under e2e/tests, that meets a requirement for a block, named by words of its title. */
type Citation = { spec: string; test: string } | { inapplicable: string };

const cite = (spec: string, test: string): Citation => ({ spec, test });
const inapplicable = (why: string): Citation => ({ inapplicable: why });

const NO_TEXT = inapplicable('it holds no text to type into');
const READ_ONLY_PAGE = cite('canvas/read-only.spec.ts', 'renders the formatted document with no editable host');

// Every block a requirement is not run for in catalogue.spec.ts, and where it is met instead. A block with no entry
// is run there, so a citation that stops matching a test fails the catalogue spec rather than leaving a silent hole.
const ELSEWHERE: Record<Requirement, Partial<Record<string, Citation>>> = {
  insert: {
    quote: cite('canvas/slash.spec.ts', 'clicking an option runs it and keeps the caret in the text'),
    divider: cite('canvas/slash-inserts.spec.ts', 'typing after /divider goes on in a line under the divider'),
    callout: cite('canvas/session.spec.ts', 'an author writes, formats, reorders, duplicates and undoes'),
    bulletedList: cite('canvas/slash.spec.ts', 'typing a query and Enter turns the paragraph into the chosen block'),
    image: cite('canvas/slash-inserts.spec.ts', '/image opens the image editor on the block'),
    file: cite('canvas/file-block.spec.ts', '/file opens the upload button of a new file block'),
    code: cite('canvas/slash-inserts.spec.ts', '/code lands the caret in the code'),
    table: cite('canvas/table.spec.ts', '/table inserts a 3 by 3 table'),
    embed: cite('canvas/embed.spec.ts', 'a press in the text while /embed asks for a link places the embed'),
    bookmark: cite('canvas/embed.spec.ts', '/bookmark asks for a link, and the card it places is filled in by the host'),
    blockEquation: cite('canvas/math.spec.ts', 'the / menu inserts a block equation'),
    tableOfContents: cite('canvas/toc.spec.ts', 'the / menu inserts a table of contents'),
  },
  edit: {
    text: cite('canvas/gutter.spec.ts', 'a click in another block closes the block menu and leaves the caret where it was'),
    quote: cite('canvas/slash.spec.ts', 'clicking an option runs it and keeps the caret in the text'),
    callout: cite('canvas/text-blocks.spec.ts', 'a callout takes a tone from its tone menu and gives the caret back to its text'),
    bulletedList: cite('canvas/slash.spec.ts', 'typing a query and Enter turns the paragraph into the chosen block'),
    image: cite('canvas/image-block.spec.ts', 'Enter on a selected image takes the caret into its caption'),
    code: cite('canvas/code-block.spec.ts', 'undo in the code goes to the editor'),
    table: cite('canvas/table.spec.ts', '/table inserts a 3 by 3 table'),
    blockEquation: cite('canvas/math.spec.ts', 'a math block opens its editor on a click, stores on Mod+Enter'),
    divider: NO_TEXT,
    file: NO_TEXT,
    embed: NO_TEXT,
    bookmark: NO_TEXT,
    tableOfContents: inapplicable('it lists the headings, and holds no text of its own'),
  },
  arrows: {
    image: cite('headless/navigation.spec.ts', 'an image drawn without a host is node-selected by arrows, which then move past it'),
  },
  undo: {},
  readOnly: {
    text: READ_ONLY_PAGE,
    heading1: READ_ONLY_PAGE,
    divider: READ_ONLY_PAGE,
    callout: READ_ONLY_PAGE,
    code: READ_ONLY_PAGE,
    todoList: cite('canvas/read-only.spec.ts', 'a click on the task box leaves it as it is'),
    toggle: cite('canvas/read-only.spec.ts', 'a reader opens and closes a closed toggle from its chevron'),
    file: cite('canvas/file-block.spec.ts', 'a read-only file card offers its download to the keyboard'),
    table: cite('canvas/table.spec.ts', 'read-only draws no controls'),
    embed: cite('canvas/embed.spec.ts', 'embeds and bookmarks have no accessibility violations, editable or read-only'),
    bookmark: cite('canvas/catalogue-together.spec.ts', 'every block with the whole catalogue on, '),
    blockEquation: cite('canvas/math.spec.ts', 'math has no accessibility violations, editable or read-only'),
    tableOfContents: cite('canvas/toc.spec.ts', 'on a read-only canvas the entries are in the tab order'),
  },
  axeWhole: {
    image: cite('canvas/image-block.spec.ts', 'an image block, its toolbar, its alt text and its width handles have no'),
    file: cite('canvas/file-block.spec.ts', 'a file block, empty or holding a file, and its toolbar have no accessibility'),
  },
  axeEditing: {
    code: cite('canvas/code-block.spec.ts', 'axe finds no violation with the code focused'),
    table: cite('canvas/table.spec.ts', 'a table has no accessibility violations, with its controls or read-only'),
    divider: NO_TEXT,
    file: NO_TEXT,
    embed: NO_TEXT,
    bookmark: NO_TEXT,
    blockEquation: inapplicable('its formula is edited in a popover, which math.spec.ts scans open'),
    tableOfContents: inapplicable('its entries are links, with no text to type into'),
  },
};

/** The blocks catalogue.spec.ts runs a requirement for: every one no other spec covers. */
export const gaps = (requirement: Requirement): CatalogueBlock[] =>
  CATALOGUE_BLOCKS.filter(({ id }) => ELSEWHERE[requirement][id] === undefined);

const TESTS = resolve(import.meta.dirname, '..', 'tests');

function broken(requirement: string, block: string, citation: Citation): string | null {
  const where = `${requirement} of ${block}`;
  if (!CATALOGUE_BLOCKS.some(({ id }) => id === block)) return `${where}: no catalogue block has that id`;
  if ('inapplicable' in citation) return null;
  const path = resolve(TESTS, citation.spec);
  if (!existsSync(path)) return `${where}: ${citation.spec} is gone`;
  return readFileSync(path, 'utf8').includes(citation.test) ? null : `${where}: ${citation.spec} has no "${citation.test}"`;
}

/** Each citation that no longer names a spec and a test in it, said in a line. */
export const brokenCitations = (): string[] =>
  Object.entries(ELSEWHERE).flatMap(([requirement, cited]) =>
    Object.entries(cited).flatMap(([block, citation]) => broken(requirement, block, citation!) ?? []),
  );
