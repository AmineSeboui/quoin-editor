import * as ai from './ai';

describe('the AI entry', () => {
  it('exports AI actions and their labels', () => {
    expect(Object.keys(ai).sort()).toEqual(['aiExtension', 'englishAiLabels']);
  });
});
