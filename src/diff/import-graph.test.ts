// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CLIENT_PATH, clientOnlyFiles, importGraph } from '../../test/support/import-graph';

const { files, packages } = importGraph('diff/index.ts');

describe('the diff entry import graph', () => {
  it('reaches the engine diff, the shared node tree and the server view, and nothing of the client', () => {
    expect(files).toEqual(
      expect.arrayContaining([
        'engine/diff/diff-blocks.ts',
        'engine/render/document-nodes.ts',
        'view-static/html-to-react.ts',
        'diff/QuoinDiff.tsx',
      ]),
    );
    expect(files.filter((path) => CLIENT_PATH.test(path))).toEqual([]);
  });

  it('loads no package but React', () => {
    expect([...packages]).toEqual(['react']);
  });

  it('reaches no file marked for the client, calling a hook, or reading a browser global', () => {
    expect(clientOnlyFiles(files)).toEqual({ client: [], hooks: [], browser: [] });
  });
});
