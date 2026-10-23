import { NPM_URL, pageHref, REPO_URL } from './site';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <p>
        Quoin is MIT licensed. <a href={REPO_URL}>Source on GitHub</a>, <a href={NPM_URL}>quoin-editor on npm</a>,{' '}
        <a href={pageHref('changelog/')}>changelog</a>.
      </p>
    </footer>
  );
}
