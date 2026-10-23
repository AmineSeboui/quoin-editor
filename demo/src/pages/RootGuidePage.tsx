import { MarkdownArticle } from '../site/MarkdownArticle';
import { changelog, migration } from '../site/sources';

const GUIDES = { migration, changelog };

/** MIGRATION.md or CHANGELOG.md from the repository root, drawn as they are, never a copy. */
export function RootGuidePage({ guide }: { guide: keyof typeof GUIDES }) {
  return <MarkdownArticle markdown={GUIDES[guide]} />;
}
