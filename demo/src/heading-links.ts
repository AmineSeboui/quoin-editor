/** Gives every section heading of an article a link to itself, so a reader can take the address of a section. */
export function addHeadingLinks() {
  for (const heading of document.querySelectorAll<HTMLElement>('.article h2[id], .article h3[id]')) {
    const link = document.createElement('a');
    link.className = 'heading-anchor';
    link.href = `#${heading.id}`;
    link.textContent = '#';
    link.setAttribute('aria-label', `Link to ${heading.textContent?.trim() ?? 'this section'}`);
    heading.append(link);
  }
}
