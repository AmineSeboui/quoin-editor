import { blockDefinitions } from './sample-blocks.mjs';

describe('the custom blocks a code sample defines', () => {
  it('are read with their type and label in either order, in either quotes', () => {
    const code = `
      const a = defineBlock({ type: 'A', label: 'First' });
      const b = defineBlock<{ points: number[] }>({
        label: "Second",
        editor: Editor,
        type: "B",
      });`;
    expect(blockDefinitions(code)).toEqual([
      { type: 'A', label: 'First' },
      { type: 'B', label: 'Second' },
    ]);
  });

  it('take only the fields of the definition itself, not those of an object inside it', () => {
    const code = `defineBlock({ parse: (data) => ({ type: 'inner', label: 'Inner' }), type: 'OUTER' })`;
    expect(blockDefinitions(code)).toEqual([{ type: 'OUTER', label: undefined }]);
  });

  it('keep a definition built from another one, which names no type of its own', () => {
    expect(blockDefinitions('defineBlock({ ...core, preview: Mine })')).toEqual([{ type: undefined, label: undefined }]);
  });
});
