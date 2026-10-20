import { catalogue } from './catalogue';
import type { ExtensionUI } from './extensions/ui-types';

describe('the catalogue entry', () => {
  it('gathers every opt-in feature, each built with the options under its name', () => {
    expect(catalogue().map((extension) => extension.name)).toEqual(['table', 'embed']);
    const [table, embed] = catalogue({ table: { labels: { table: 'Tableau' } }, embed: { labels: { embed: 'Int\u00e9grer' } } });
    expect((table.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Tableau']);
    expect((embed.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Int\u00e9grer', 'Bookmark']);
  });

  it('leaves out a feature set to false', () => {
    expect(catalogue({ table: false }).map((extension) => extension.name)).toEqual(['embed']);
    expect(catalogue({ table: false, embed: false })).toEqual([]);
  });
});
