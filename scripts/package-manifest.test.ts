// @vitest-environment node
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readText, root } from './docs-sources.mjs';
import { packageExports } from './entry-outputs.mjs';
import { packageEntries } from './package-entries.mjs';

const manifest = JSON.parse(readText(join(root, 'package.json')));

describe('the package manifest', () => {
  it('describes the 1.0 editor', () => {
    expect(manifest.description).toBe(
      'Markdown-native block editor for React: live formatting, Notion-style menus, drag and drop, collaboration hooks and your own React blocks. MIT.',
    );
    expect(manifest.keywords).toEqual(
      expect.arrayContaining(['block-editor', 'markdown-editor', 'wysiwyg', 'rich-text-editor', 'collaborative-editing', 'yjs']),
    );
    expect(new Set(manifest.keywords).size).toBe(manifest.keywords.length);
  });

  it('names its author, its docs site, its repository and its issues', () => {
    expect(manifest.author).toEqual({ name: 'Amine Sboui', url: 'https://github.com/AmineSeboui' });
    expect(manifest.homepage).toBe('https://amineseboui.github.io/quoin-editor/');
    expect(manifest.repository).toEqual({ type: 'git', url: 'git+https://github.com/AmineSeboui/quoin-editor.git' });
    expect(manifest.bugs).toEqual({ url: 'https://github.com/AmineSeboui/quoin-editor/issues' });
  });

  it('takes React 18.2 or 19 and yjs only when the host collaborates', () => {
    expect(manifest.peerDependencies).toMatchObject({ react: '^18.2.0 || ^19.0.0', 'react-dom': '^18.2.0 || ^19.0.0' });
    expect(manifest.peerDependenciesMeta).toEqual({ yjs: { optional: true } });
  });

  it('exports every entry, the stylesheet and the manifest', () => {
    expect(manifest.exports).toEqual(packageExports(packageEntries));
    expect(Object.keys(manifest.exports)).toHaveLength(packageEntries.length + 2);
  });

  it('publishes the build and the documents a reader of the tarball needs', () => {
    expect(manifest.files).toEqual(['dist', 'README.md', 'LICENSE', 'CHANGELOG.md', 'MIGRATION.md']);
    expect(manifest.sideEffects).toEqual(['*.css']);
  });
});
