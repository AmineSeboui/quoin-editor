export type Frontmatter = { title: string; description: string };

const BLOCK = /^---\n([\s\S]*?)\n---\n/;

/** The title and description a docs source declares at its top, and the markdown after them. */
export function splitFrontmatter(source: string): { meta: Frontmatter; body: string } {
  const match = BLOCK.exec(source);
  if (!match) throw new Error('a docs source starts with a title and a description');
  const fields = new Map(
    match[1].split('\n').map((line) => {
      const colon = line.indexOf(':');
      return [line.slice(0, colon).trim(), line.slice(colon + 1).trim()] as const;
    }),
  );
  const title = fields.get('title');
  const description = fields.get('description');
  if (!title || !description) throw new Error('a docs source needs both a title and a description');
  return { meta: { title, description }, body: source.slice(match[0].length) };
}
