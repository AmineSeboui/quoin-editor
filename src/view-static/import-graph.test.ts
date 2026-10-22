// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CLIENT_PATH, clientOnlyFiles, importGraph } from '../../test/support/import-graph';

const { files, packages } = importGraph('view-static/index.ts');

describe('the view entry import graph', () => {
  it('reaches the engine renderer and nothing of the client', () => {
    expect(files).toEqual(expect.arrayContaining(['engine/render/document-nodes.ts', 'view-static/QuoinView.tsx']));
    expect(files.filter((path) => CLIENT_PATH.test(path))).toEqual([]);
  });

  it('loads no package but React', () => {
    expect([...packages]).toEqual(['react']);
  });

  it('reaches no file marked for the client, calling a hook, or reading a browser global', () => {
    expect(clientOnlyFiles(files)).toEqual({ client: [], hooks: [], browser: [] });
  });
});
