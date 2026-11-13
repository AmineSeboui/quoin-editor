/**
 * @typedef {import('../src/engine').QuoinBlock} QuoinBlock
 * @typedef {{
 *   fromMarkdown: (markdown: string, options?: { newId?: () => string }) => QuoinBlock[];
 *   toMarkdown: (blocks: readonly QuoinBlock[]) => string;
 *   toHTML: (blocks: readonly QuoinBlock[]) => string;
 * }} Engine
 * @typedef {{ line: number; source: string | null; written: string | null }} Difference
 * @typedef {{ block: number; converted: string | null; readBack: string | null }} Redrawn
 * @typedef {{
 *   status: 'unchanged' | 'changed' | 'failed';
 *   frontMatter: string | null;
 *   blocks: QuoinBlock[] | null;
 *   markdown: string;
 *   difference?: Difference;
 *   redrawn?: Redrawn;
 *   error?: string;
 * }} RoundTrip
 */

const FRONT_MATTER = /^---\n(?![ \t]*\n)(?:[^\n]*\n)*?(?:---|\.\.\.)\n/;

/**
 * A YAML block at the very top of a file, which markdown would read as a divider and a heading. A blank line under the
 * first `---` makes it a divider instead, since front matter never starts with one.
 * @param {string} text
 * @returns {{ frontMatter: string | null; body: string; lines: number }}
 */
export function splitFrontMatter(text) {
  const match = FRONT_MATTER.exec(text);
  if (!match) return { frontMatter: null, body: text, lines: 0 };
  const frontMatter = match[0];
  return { frontMatter, body: text.slice(frontMatter.length), lines: frontMatter.split('\n').length - 1 };
}

/**
 * The lines a file is compared by, and how many blank lines it starts with: blank lines at either edge and a missing
 * final newline make no difference, so a file counts as unchanged when only those differ.
 * @param {string} text
 */
function comparable(text) {
  const leading = /^(?:[ \t]*\n)*/.exec(text)?.[0] ?? '';
  return { lines: text.slice(leading.length).trimEnd().split('\n'), skipped: leading.split('\n').length - 1 };
}

/**
 * @param {string[]} source
 * @param {string[]} written
 * @param {number} offset
 * @returns {Difference | undefined}
 */
function firstDifference(source, written, offset) {
  const length = Math.max(source.length, written.length);
  for (let at = 0; at < length; at += 1) {
    if (source[at] !== written[at]) return { line: at + 1 + offset, source: source[at] ?? null, written: written[at] ?? null };
  }
  return undefined;
}

/** @param {readonly QuoinBlock[]} blocks */
const replayIds = (blocks) => {
  let next = 0;
  return () => blocks[next++]?.id ?? `extra-${next}`;
};

/** @param {QuoinBlock | undefined} block */
const described = (block) => (block ? JSON.stringify({ ...block, id: undefined }) : null);

/**
 * The first block that draws differently once read back. The shortest run of leading blocks that draws differently
 * ends at it, and drawing runs rather than single blocks keeps each list number in the context that gives it.
 * @param {readonly QuoinBlock[]} blocks
 * @param {readonly QuoinBlock[]} readBack
 * @param {Engine['toHTML']} toHTML
 * @returns {Redrawn}
 */
function firstRedrawn(blocks, readBack, toHTML) {
  const drawsAlike = (count) => toHTML(blocks.slice(0, count)) === toHTML(readBack.slice(0, count));
  let alike = 0;
  let unlike = Math.max(blocks.length, readBack.length);
  while (unlike - alike > 1) {
    const middle = (alike + unlike) >> 1;
    if (drawsAlike(middle)) alike = middle;
    else unlike = middle;
  }
  return { block: unlike, converted: described(blocks[unlike - 1]), readBack: described(readBack[unlike - 1]) };
}

/**
 * Converts one markdown file to blocks, writes the blocks back as markdown and reads that again. A file is unchanged
 * when the markdown written back is the markdown read, changed when it differs, and failed when the conversion throws
 * or when what was written reads back to a document that draws differently from the first conversion.
 * @param {string} text
 * @param {Engine} engine
 * @param {{ newId?: () => string }} [options]
 * @returns {RoundTrip}
 */
export function roundTrip(text, engine, options = {}) {
  const { frontMatter, body, lines } = splitFrontMatter(text.replace(/\r\n?/g, '\n'));
  try {
    const blocks = engine.fromMarkdown(body, { newId: options.newId });
    const markdown = engine.toMarkdown(blocks);
    const source = comparable(body);
    const difference = firstDifference(source.lines, comparable(markdown).lines, lines + source.skipped);
    const readBack = engine.fromMarkdown(markdown, { newId: replayIds(blocks) });
    if (engine.toHTML(readBack) !== engine.toHTML(blocks)) {
      const redrawn = firstRedrawn(blocks, readBack, engine.toHTML);
      return { status: 'failed', frontMatter, blocks, markdown, redrawn, error: 'reads back differently once written' };
    }
    return { status: difference ? 'changed' : 'unchanged', frontMatter, blocks, markdown, difference };
  } catch (error) {
    return { status: 'failed', frontMatter, blocks: null, markdown: '', error: error instanceof Error ? error.message : String(error) };
  }
}
