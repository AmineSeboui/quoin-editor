/**
 * The areas an entry's exports are listed under, in the order the reference lists them, each with what it is for. A
 * declaration is listed under the first area whose directory holds it, and the generator stops when one holds none,
 * so a new area of the source cannot reach the site unnamed.
 * @typedef {{ dir: string, title: string, blurb: string }} Section
 */

/** @type {Section[]} */
export const ENGINE_SECTIONS = [
  {
    dir: 'src/engine/model',
    title: 'The document',
    blurb: 'Blocks, the inline nodes inside them and the marks on those nodes: the shapes every other part reads and writes.',
  },
  {
    dir: 'src/engine/schema',
    title: 'The schema',
    blurb: 'What types of block, mark and atom a document may hold, and how each is read from and written back to markdown.',
  },
  {
    dir: 'src/engine/blocks',
    title: 'Blocks and the codec',
    blurb: 'The block types every document starts with, and the translation between stored blocks and the tree the engine edits.',
  },
  {
    dir: 'src/engine/transform',
    title: 'Steps',
    blurb: 'The smallest changes a document takes. Commands are built from them, history inverts them, and a collaboration adapter sends them over the wire.',
  },
  {
    dir: 'src/engine/state',
    title: 'State, transactions and plugins',
    blurb: 'The state a view draws, the transaction that carries steps and a selection into the next state, and the plugins that watch both.',
  },
  {
    dir: 'src/engine/commands',
    title: 'Commands',
    blurb: 'A command reads the state and either reports that it would apply or dispatches a transaction that applies it.',
  },
  {
    dir: 'src/engine/rules',
    title: 'Input rules',
    blurb: 'What typing turns into as it is typed, such as a heading from a hash and a space, or a dash pair into a dash.',
  },
  {
    dir: 'src/engine/clipboard',
    title: 'The clipboard',
    blurb: 'HTML a reader pastes, read into blocks, and the slice of a document a copy carries.',
  },
  {
    dir: 'src/engine/markdown',
    title: 'Markdown in and out',
    blurb: 'The parser and the serialiser that make markdown the storage format, for whole documents and for inline runs.',
  },
  {
    dir: 'src/engine/render',
    title: 'Rendering a document out',
    blurb: 'A document as HTML, as plain text or as counts, with no editor and no DOM.',
  },
  {
    dir: 'src/engine/diff',
    title: 'Differences between documents',
    blurb: 'What changed between two versions, block by block and within a block, for a diff view or a review.',
  },
  {
    dir: 'src/engine/extension',
    title: 'Extensions and the editor',
    blurb: 'An extension adds commands, keys, rules and plugins; the editor is the set of them, resolved and bound to a state.',
  },
];

/** @type {Section[]} */
export const VIEW_SECTIONS = [
  {
    dir: 'src/view/react',
    title: 'Hooks and components',
    blurb: 'The hook that creates the editor and its controller, and the components that draw the document and keep the selection.',
  },
  {
    dir: 'src/view/controller',
    title: 'The controller',
    blurb: 'The object that binds an editor to the page: it dispatches transactions, holds the editable hosts and keeps the DOM in step.',
  },
  {
    dir: 'src/view/dom',
    title: 'The DOM map',
    blurb: 'Inline nodes drawn into an element, and the map between a position in the document and a point in the DOM.',
  },
  {
    dir: 'src/view/selection',
    title: 'Selection',
    blurb: 'What the view needs to tell a selection inside one block from one that crosses several.',
  },
  {
    dir: 'src/view/input',
    title: 'Keys',
    blurb: 'Where a host takes a key before the editor does.',
  },
  {
    dir: 'src/view/navigation',
    title: 'Caret placement',
    blurb: 'Where a point on the screen puts the caret, which the arrow keys and a pointer both ask for.',
  },
];

/**
 * The exports of a section, in alphabetical order, and the rest after them.
 * @param {{ file: string }[]} exports
 * @param {Section} section
 */
export const inSection = (exports, section) => exports.filter(({ file }) => file.startsWith(`${section.dir}/`));
