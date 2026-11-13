import { DOCS_HOME } from '../site/site';

/** What the development server shows at a guide address; the build writes a notice that redirects instead. */
export function DocPage({ slug }: { slug: string }) {
  const to = `${DOCS_HOME}${slug}`;
  return (
    <article className="article">
      <h1>This page has moved</h1>
      <p>Quoin's documentation is served from quoincloud.com now.</p>
      <p>
        <a href={to}>{to}</a>
      </p>
    </article>
  );
}
