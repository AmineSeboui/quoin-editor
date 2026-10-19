import { catalogue } from './catalogue';

describe('the catalogue entry', () => {
  it('gathers no opt-in feature until one ships', () => {
    expect(catalogue()).toEqual([]);
    expect(catalogue({})).toEqual([]);
  });
});
