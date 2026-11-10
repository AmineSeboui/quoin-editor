import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { referencePage } from './api-page.mjs';
import { ENGINE_SECTIONS, VIEW_SECTIONS } from './api-sections.mjs';
import { readEntries } from './api-surface.mjs';
import { docsDir, DOCS_URL, REFERENCE_SLUGS, root } from './docs-sources.mjs';

const [ENGINE_SLUG, HEADLESS_SLUG] = REFERENCE_SLUGS;
const ENGINE_LINK = `[Engine reference](${DOCS_URL}${ENGINE_SLUG})`;
const HEADLESS_LINK = `[Headless reference](${DOCS_URL}${HEADLESS_SLUG})`;

const GENERATED = 'read from the package’s own source each time the site is built';

const ENGINE = {
  slug: ENGINE_SLUG,
  title: 'Engine reference',
  description:
    'Every export of quoin-editor/engine with its signature: the document, steps, commands, markdown and the editor.',
  lead: [
    `\`quoin-editor/engine\` is the editing engine on its own, with no React and no DOM. Every name it exports is listed here with the signature the published types carry, ${GENERATED}.`,
    `Nothing is held back. An entry of the package is a contract, so a name that should not be public should stop being exported rather than be left off this page. [Exports](${DOCS_URL}api) says in prose what each entry of the package is for, and ${HEADLESS_LINK} lists what \`quoin-editor/headless\` adds on top of this one.`,
  ],
  sections: ENGINE_SECTIONS,
};

const HEADLESS = {
  slug: HEADLESS_SLUG,
  title: 'Headless reference',
  description:
    'Every export quoin-editor/headless adds to the engine: the hook, the editable view, the controller and the DOM map.',
  lead: [
    `\`quoin-editor/headless\` is the editing engine and its editable view, with none of the canvas UI. It exports everything in the ${ENGINE_LINK} and the names here on top of it: the React layer that draws a document, and the controller that binds an editor to the page.`,
    `Each one carries the signature the published types carry, ${GENERATED}. [Headless](${DOCS_URL}headless) shows the layer working, in one page of code.`,
  ],
  sections: VIEW_SECTIONS,
};

/** The two generated reference pages, by their slug, as the docs sources hold them. */
export function referenceMarkdown() {
  const entries = readEntries(root, [
    { name: 'engine', source: 'src/engine/index.ts' },
    { name: 'headless', source: 'src/headless.ts' },
  ]);
  const engine = entries.get('engine');
  const inEngine = new Set(engine.map(({ name }) => name));
  const added = entries.get('headless').filter(({ name }) => !inEngine.has(name));
  return new Map([
    [ENGINE.slug, referencePage({ ...ENGINE, exports: engine })],
    [HEADLESS.slug, referencePage({ ...HEADLESS, exports: added })],
  ]);
}

export const referenceFile = (slug) => join(docsDir, `${slug}.md`);

const current = (slug) => {
  try {
    return readFileSync(referenceFile(slug), 'utf8');
  } catch {
    return '';
  }
};

function write() {
  const written = [...referenceMarkdown()].filter(([slug, markdown]) => {
    if (current(slug) === markdown) return false;
    writeFileSync(referenceFile(slug), markdown);
    return true;
  });
  console.log(written.length === 0 ? 'the API reference is up to date' : `wrote ${written.map(([slug]) => slug).join(', ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) write();
