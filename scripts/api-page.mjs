import { inSection } from './api-sections.mjs';

const oneLine = (text) => text.replace(/\s+/g, ' ').trim();

const entryText = ({ name, doc, signature, file, line }) =>
  [`### ${name}`, doc ? oneLine(doc) : null, `\`\`\`ts\n${signature}\n\`\`\``, `[${name} on GitHub](${file}#L${line})`]
    .filter((part) => part !== null)
    .join('\n\n');

/**
 * A reference page: its frontmatter, the prose it opens with, then a part for each area with the exports that live
 * there. An export under no area, or an area with no export, fails the build rather than reaching the site unlisted.
 * @param {{ title: string, description: string, lead: string[], sections: import('./api-sections.mjs').Section[], exports: import('./api-surface.mjs').ApiExport[] }} page
 * @returns {string}
 */
export function referencePage({ title, description, lead, sections, exports }) {
  const parts = [`---\ntitle: ${title}\ndescription: ${description}\n---`, `# ${title}`, ...lead];
  const listed = new Set();
  for (const section of sections) {
    const entries = inSection(exports, section);
    if (entries.length === 0) throw new Error(`the "${section.title}" part of ${title} would be empty`);
    for (const entry of entries) listed.add(entry.name);
    parts.push(`## ${section.title}`, section.blurb, ...entries.map(entryText));
  }
  const missed = exports.filter(({ name }) => !listed.has(name)).map(({ name }) => name);
  if (missed.length > 0) throw new Error(`${title} has no part for ${missed.join(', ')}`);
  return `${parts.join('\n\n')}\n`;
}
