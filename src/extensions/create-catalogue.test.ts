import { defineExtension } from '../engine';
import { createCatalogue } from './create-catalogue';

const tableExtension = (options: { headerRow?: boolean } = {}) =>
  defineExtension({ name: 'table', ui: { headerRow: options.headerRow ?? false } });
const mathExtension = (options?: { renderMath?: (latex: string) => string }) =>
  defineExtension({ name: 'math', ui: { custom: options?.renderMath !== undefined } });

const catalogue = createCatalogue({ table: tableExtension, math: mathExtension });

describe('createCatalogue', () => {
  it('builds every feature, in order, with its defaults when given no options', () => {
    expect(catalogue()).toEqual([tableExtension(), mathExtension()]);
  });

  it('hands each feature its own options', () => {
    const renderMath = (latex: string) => latex;
    expect(catalogue({ table: { headerRow: true }, math: { renderMath } })).toEqual([
      tableExtension({ headerRow: true }),
      mathExtension({ renderMath }),
    ]);
  });

  it('leaves out a feature set to false', () => {
    expect(catalogue({ table: false })).toEqual([mathExtension()]);
  });

  it('types the options of each feature by name', () => {
    // @ts-expect-error the table takes a boolean header row
    void (() => catalogue({ table: { headerRow: 'yes' } }));
    // @ts-expect-error there is no such feature
    void (() => catalogue({ chart: {} }));
    expect(createCatalogue({})()).toEqual([]);
  });
});
