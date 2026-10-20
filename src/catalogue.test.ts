import { catalogue } from './catalogue';
import { atom } from './engine';
import type { ExtensionUI } from './extensions/ui-types';

describe('the catalogue entry', () => {
  it('gathers every opt-in feature, each built with the options under its name', () => {
    expect(catalogue().map((extension) => extension.name)).toEqual(['table', 'embed', 'math']);
    const [table, embed, math] = catalogue({
      table: { labels: { table: 'Tableau' } },
      embed: { labels: { embed: 'Int\u00e9grer' } },
      math: { renderMath: () => '<b>drawn</b>' },
    });
    expect((table.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Tableau']);
    expect((embed.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Int\u00e9grer', 'Bookmark']);
    const drawn = (math.ui as ExtensionUI).render?.atoms?.math(atom('math', { latex: 'x' }), document);
    expect(drawn?.innerHTML).toBe('<b>drawn</b>');
  });

  it('leaves out a feature set to false', () => {
    expect(catalogue({ table: false }).map((extension) => extension.name)).toEqual(['embed', 'math']);
    expect(catalogue({ table: false, embed: false, math: false })).toEqual([]);
  });
});
