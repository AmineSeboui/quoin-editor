import { englishTocLabels, resolveTocLabels } from './toc-labels';

describe('the table of contents labels', () => {
  it('are English by default', () => {
    const labels = resolveTocLabels();
    expect(labels).toBe(englishTocLabels);
    expect([labels.tableOfContents, labels.tableOfContentsDescription, labels.noHeadings]).toEqual([
      'Table of contents',
      'Links to the headings of the page',
      'Add headings to build the table of contents',
    ]);
    expect(labels.tableOfContentsNumbered(2)).toBe('Table of contents 2');
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const labels = resolveTocLabels({
      tableOfContents: 'Sommaire',
      noHeadings: undefined,
      tableOfContentsNumbered: (n) => `Sommaire ${n}`,
    });
    expect(labels.tableOfContents).toBe('Sommaire');
    expect(labels.tableOfContentsNumbered(3)).toBe('Sommaire 3');
    expect(labels.noHeadings).toBe('Add headings to build the table of contents');
    expect(resolveTocLabels({ noHeadings: undefined })).toBe(englishTocLabels);
  });

  it('name everything with a non-empty string', () => {
    const values = Object.values(englishTocLabels).map((value) => (typeof value === 'function' ? value(2) : value));
    expect(values.every((value) => value.trim() !== '')).toBe(true);
  });
});
