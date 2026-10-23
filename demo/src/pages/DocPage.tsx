import { MarkdownArticle } from '../site/MarkdownArticle';
import { docSources } from '../site/sources';

export function DocPage({ slug }: { slug: string }) {
  const source = docSources.get(slug);
  if (!source) throw new Error(`no docs source for ${slug}`);
  return <MarkdownArticle markdown={source.body} />;
}
