import { catalogue } from './catalogue';
import type { ExtensionUI } from './extensions/ui-types';

describe('the catalogue entry', () => {
  it('gathers every opt-in feature, each built with the options under its name', () => {
    expect(catalogue().map((extension) => extension.name)).toEqual(['table']);
    const [table] = catalogue({ table: { labels: { table: 'Tableau' } } });
    expect((table.ui as ExtensionUI).slashItems?.map((item) => item.title)).toEqual(['Tableau']);
  });

  it('leaves out a feature set to false', () => {
    expect(catalogue({ table: false })).toEqual([]);
  });
});
