import * as engine from './engine';
import * as headless from './headless';
import * as view from './view';

describe('headless entry', () => {
  it('exports the editable view and the engine, and nothing else', () => {
    const expected = new Set([...Object.keys(view), ...Object.keys(engine)]);
    expect(Object.keys(headless).sort()).toEqual([...expected].sort());
  });
});
