import type { Page } from '../site/pages';
import { ComparisonPage } from './ComparisonPage';
import { AiPage, BlocksPage, CollaborationPage, CommentsPage, PlaygroundPage, ServerRenderingPage } from './demo-pages';
import { DocPage } from './DocPage';
import { HomePage } from './HomePage';
import { NotFoundPage } from './NotFoundPage';
import { RootGuidePage } from './RootGuidePage';

export function PageBody({ page }: { page: Page }) {
  switch (page.kind) {
    case 'home':
      return <HomePage />;
    case 'doc':
      return <DocPage slug={page.slug} />;
    case 'playground':
      return <PlaygroundPage page={page} />;
    case 'blocks':
      return <BlocksPage page={page} />;
    case 'collaboration':
      return <CollaborationPage page={page} />;
    case 'ai':
      return <AiPage page={page} />;
    case 'comments':
      return <CommentsPage page={page} />;
    case 'server-rendering':
      return <ServerRenderingPage page={page} />;
    case 'comparison':
      return <ComparisonPage />;
    case 'migration':
    case 'changelog':
      return <RootGuidePage guide={page.kind} />;
    case 'not-found':
      return <NotFoundPage />;
  }
}
