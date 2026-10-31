import { BrandMark } from './BrandMark';
import { NPM_URL, pageHref, REPO_URL } from './site';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p className="brand">
          <BrandMark />
          Quoin is MIT licensed.
        </p>
        <ul className="footer-links">
          <li>
            <a href={REPO_URL}>Source on GitHub</a>
          </li>
          <li>
            <a href={NPM_URL}>quoin-editor on npm</a>
          </li>
          <li>
            <a href={pageHref('changelog/')}>Changelog</a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
