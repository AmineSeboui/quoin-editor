// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CLIENT_PATH, clientOnlyFiles, importGraph } from '../../test/support/import-graph';
import * as entry from './index';

const ENGINE_ENTRY = 'engine/index.ts';
const { files, packages } = importGraph('pdf/index.ts');
const own = importGraph('pdf/index.ts', [ENGINE_ENTRY]).files.filter((path) => path !== ENGINE_ENTRY);

describe('the pdf entry', () => {
  it('exports toPdf alone', () => {
    expect(Object.keys(entry)).toEqual(['toPdf']);
  });

  it('loads the whole engine entry, which a server loads too, and nothing of React, the client, the views or the Word export', () => {
    expect(files).toContain(ENGINE_ENTRY);
    expect(files.filter((path) => CLIENT_PATH.test(path) || /^(?:view-static|diff|docx)\//.test(path))).toEqual([]);
    expect([...packages]).toEqual([]);
  });

  it('reads blocks through the engine block reading, never through the HTML it writes', () => {
    expect(own).toEqual(expect.arrayContaining(['engine/render/block-groups.ts', 'engine/render/engine-blocks.ts']));
    const htmlWriters = /^engine\/render\/(?:document-nodes|block-node|inline-nodes|media-nodes|serialize-html|to-html)\.ts$/;
    expect(own.filter((path) => htmlWriters.test(path))).toEqual([]);
  });

  it('reaches no file marked for the client, calling a hook, or reading a browser global', () => {
    expect(clientOnlyFiles(own)).toEqual({ client: [], hooks: [], browser: [] });
    expect(clientOnlyFiles(files).client).toEqual([]);
  });
});
