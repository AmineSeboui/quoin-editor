import { MarkdownArticle } from '../site/MarkdownArticle';
import { PageSteps } from '../site/PageSteps';
import { guidePages } from '../site/pages';
import { docSources } from '../site/sources';

export function DocPage({ slug }: { slug: string }) {
  const source = docSources.get(slug);
  if (!source) throw new Error(`no docs source for ${slug}`);
  const index = guidePages.findIndex((page) => page.kind === 'doc' && page.slug === slug);
  return (
    <>
      <MarkdownArticle markdown={source.body} />
      <PageSteps previous={guidePages[index - 1]} next={guidePages[index + 1]} />
    </>
  );
}
