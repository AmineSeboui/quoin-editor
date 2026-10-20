import { englishTocLabels, resolveTocLabels } from './toc-labels';

describe('the table of contents labels', () => {
  it('are English by default', () => {
    const labels = resolveTocLabels();
    expect(labels).toBe(englishTocLabels);
    expect(labels).toEqual({
      tableOfContents: 'Table of contents',
      tableOfContentsDescription: 'Links to the headings of the page',
      noHeadings: 'Add headings to build the table of contents',
    });
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const labels = resolveTocLabels({ tableOfContents: 'Sommaire', noHeadings: undefined });
    expect(labels.tableOfContents).toBe('Sommaire');
    expect(labels.noHeadings).toBe('Add headings to build the table of contents');
    expect(resolveTocLabels({ noHeadings: undefined })).toBe(englishTocLabels);
  });

  it('name everything with a non-empty string', () => {
    expect(Object.values(englishTocLabels).every((value) => value.trim() !== '')).toBe(true);
  });
});
