import { pageHref } from '../site/site';

const FEATURES = [
  {
    title: 'Comments',
    text: 'Threads anchored to text, with replies, resolving and deleting, kept in a store you own.',
    path: 'comments/',
  },
  {
    title: 'Every block you expect',
    text: 'Callouts, toggles, tasks, code, tables, math, embeds, mentions and a table of contents.',
    path: 'blocks/',
  },
  {
    title: 'Custom blocks in plain React',
    text: 'Any React component can be a block, with an editor, a preview or both. No schema language to learn.',
    path: 'docs/custom-blocks/',
  },
  {
    title: 'A document you control',
    text: 'The document is plain JSON passed in and handed back on every change, so saving and versioning stay in your code.',
    path: 'docs/contract/',
  },
  {
    title: 'Server rendering, diffs and Word',
    text: 'Draw a document, or what changed between two versions, on the server with no editor loaded, or export it to Word.',
    path: 'server-rendering/',
  },
  {
    title: 'Built for the keyboard',
    text: 'Write a whole document without the mouse. Moves and deletions are announced, and axe checks the canvas and its menus in light and dark mode.',
    path: 'docs/accessibility/',
  },
];

/** The rest of what ships, each item linking to its live demo or its guide. */
export function HomeFeatures() {
  return (
    <section className="features" aria-labelledby="features-heading">
      <h2 id="features-heading">Also in the box</h2>
      <ul>
        {FEATURES.map(({ title, text, path }) => (
          <li key={title}>
            <h3>
              <a href={pageHref(path)}>{title}</a>
            </h3>
            <p>{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
