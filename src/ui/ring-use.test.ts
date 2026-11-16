const STYLESHEETS = import.meta.glob<string>('/src/**/*.css', { query: '?raw', import: 'default', eager: true });
const SOURCES = import.meta.glob<string>(['/src/**/*.{ts,tsx}', '!/src/**/*.test.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

const READS_RING = /var\(--quoin-ring\)/;
const RING_UTILITY = /[\w:[\]=()-]*\b(?:border|bg|outline|fill|stroke|text|ring|decoration)-ring\b/g;

function ringRulesWithoutFocus(): string[] {
  return Object.entries(STYLESHEETS).flatMap(([file, css]) =>
    css.split('}').flatMap((chunk) => {
      const parts = chunk.split('{');
      if (parts.length < 2) return [];
      const selector = parts.at(-2)!.trim();
      const reads = parts
        .at(-1)!
        .split(';')
        .some((declaration) => !declaration.trim().startsWith('--') && READS_RING.test(declaration));
      return reads && !selector.includes(':focus') ? [`${file}: ${selector}`] : [];
    }),
  );
}

function ringUtilitiesWithoutFocus(): string[] {
  return Object.entries(SOURCES).flatMap(([file, source]) =>
    [...source.matchAll(RING_UTILITY)]
      .map(([utility]) => utility)
      .filter((utility) => !utility.slice(0, utility.lastIndexOf(':') + 1).includes('focus'))
      .map((utility) => `${file}: ${utility}`),
  );
}

describe('the ring colour', () => {
  it('is read only by focus rules in the stylesheets', () => {
    expect(ringRulesWithoutFocus()).toEqual([]);
  });

  it('is used only under a focus variant in class lists', () => {
    expect(ringUtilitiesWithoutFocus()).toEqual([]);
  });
});
