import { QuoinDiff } from 'quoin-editor/diff';
import { QuoinView } from 'quoin-editor/view';
import { aiDocument } from '../content/ai-document';
import { collaborationDocument } from '../content/collaboration-document';
import { commentsDocument } from '../content/comments-document';
import { everyBlock } from '../content/every-block';
import { firstVersion, secondVersion } from '../content/versions';
import { Island } from '../site/Island';
import type { Page } from '../site/pages';
import { DemoPage } from './DemoPage';

export function BlocksPage({ page }: { page: Page }) {
  return (
    <DemoPage page={page} guide="extensions" guideTitle="Opt-in features">
      <p>
        The whole catalogue is loaded here. Math shows its LaTeX source, since this page passes no renderer such as KaTeX,
        and the embed links to a page no provider frames, so nothing loads from another site.
      </p>
      <Island name="blocks" blocks={everyBlock} />
    </DemoPage>
  );
}

export function CollaborationPage({ page }: { page: Page }) {
  return (
    <DemoPage page={page} guide="collaboration" guideTitle="Collaboration">
      <p>Each editor has its own Yjs document; a BroadcastChannel relays their updates and carets as a server would.</p>
      <Island name="collaboration" blocks={collaborationDocument} />
    </DemoPage>
  );
}

export function AiPage({ page }: { page: Page }) {
  return (
    <DemoPage page={page} guide="ai" guideTitle="AI actions">
      <p className="notice">
        <strong>A simulation.</strong> No model is called: this page answers each request with canned text, streamed word by
        word as a model&apos;s answer would arrive. Your host passes its own stream to aiExtension.
      </p>
      <Island name="ai" blocks={aiDocument} />
    </DemoPage>
  );
}

export function CommentsPage({ page }: { page: Page }) {
  return (
    <DemoPage page={page} guide="comments" guideTitle="Comments">
      <p>The threads live in a store this page keeps in memory; a host keeps them in its own service.</p>
      <Island name="comments" blocks={commentsDocument} />
    </DemoPage>
  );
}

export function ServerRenderingPage({ page }: { page: Page }) {
  return (
    <DemoPage page={page} guide="server-rendering" guideTitle="Read-only and server rendering">
      <p>Both drawings below were written into this page&apos;s HTML when the site was built. The page loads no editor.</p>
      <section aria-labelledby="view-heading">
        <h2 id="view-heading">The document, drawn by QuoinView</h2>
        <QuoinView blocks={secondVersion.map((block) => ({ ...block, id: `view-${block.id}` }))} className="prose framed" />
      </section>
      <section aria-labelledby="diff-heading">
        <h2 id="diff-heading">What changed since the last version, drawn by QuoinDiff</h2>
        <QuoinDiff before={firstVersion} after={secondVersion} className="prose framed" />
      </section>
    </DemoPage>
  );
}
