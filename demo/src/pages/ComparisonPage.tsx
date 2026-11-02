import { MarkdownArticle } from '../site/MarkdownArticle';
import { readmeSection } from '../site/readme-section';
import { readme } from '../site/sources';

/** The README's comparison, its one source, with its date and its sources. */
export function ComparisonPage() {
  return (
    <>
      <h1>Quoin vs Tiptap, BlockNote and Editor.js</h1>
      <MarkdownArticle markdown={readmeSection(readme, 'Why Quoin')} />
    </>
  );
}
