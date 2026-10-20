import { catalogue } from './catalogue';
import { atom } from './engine';
import type { ExtensionUI } from './extensions/ui-types';

describe('the catalogue entry', () => {
  it('gathers every opt-in feature, each built with the options under its name', () => {
    expect(catalogue().map((extension) => extension.name)).toEqual(['table', 'embed', 'math', 'toc']);
    const [table, embed, math, toc] = catalogue({
      table: { labels: { table: 'Tableau' } },
      embed: { labels: { embed: 'Int\u00e9grer' } },
      math: { renderMath: () => '<b>drawn</b>', labels: { inlineEquation: 'Formule' } },
      toc: { labels: { tableOfContents: 'Sommaire' } },
    });
    expect((table.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Tableau']);
    expect((embed.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Int\u00e9grer', 'Bookmark']);
    expect((math.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Block equation', 'Formule']);
    const drawn = (math.ui as ExtensionUI).render?.atoms?.math(atom('math', { latex: 'x' }), document);
    expect(drawn?.innerHTML).toBe('<b>drawn</b>');
    expect((toc.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Sommaire']);
  });

  it('leaves out a feature set to false', () => {
    expect(catalogue({ table: false }).map((extension) => extension.name)).toEqual(['embed', 'math', 'toc']);
    expect(catalogue({ table: false, embed: false, math: false, toc: false })).toEqual([]);
  });
});
