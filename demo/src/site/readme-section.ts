/** The text under a level 2 heading of a markdown file, up to the next heading of level 2 or higher. */
export function readmeSection(markdown: string, heading: string): string {
  const lines = markdown.split('\n');
  const start = lines.indexOf(`## ${heading}`);
  if (start === -1) throw new Error(`the README has no section ${heading}`);
  const end = lines.findIndex((line, index) => index > start && /^#{1,2} /.test(line));
  return lines.slice(start + 1, end === -1 ? undefined : end).join('\n');
}
