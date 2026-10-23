import * as presence from './presence';

describe('the presence entry', () => {
  it('exports presence and its labels', () => {
    expect(Object.keys(presence).sort()).toEqual(['englishPresenceLabels', 'presenceExtension']);
  });
});
