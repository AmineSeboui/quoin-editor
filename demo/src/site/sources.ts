import changelog from '../../../CHANGELOG.md?raw';
import migration from '../../../MIGRATION.md?raw';
import readme from '../../../README.md?raw';
import { splitFrontmatter, type Frontmatter } from './frontmatter';

export type DocSource = Frontmatter & { slug: string; body: string };

const files = import.meta.glob<string>('../../docs/*.md', { query: '?raw', import: 'default', eager: true });

const slugOf = (path: string) => path.slice(path.lastIndexOf('/') + 1, -'.md'.length);

/** Every docs page source, by slug. */
export const docSources: ReadonlyMap<string, DocSource> = new Map(
  Object.entries(files).map(([path, source]) => {
    const { meta, body } = splitFrontmatter(source);
    return [slugOf(path), { slug: slugOf(path), ...meta, body }];
  }),
);

export { changelog, migration, readme };
