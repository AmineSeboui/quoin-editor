import { CLOUD_URL } from './site';

export function SiteNotice() {
  return (
    <aside className="site-notice" aria-label="Site notice">
      <p>
        The documentation and the project home moved to <a href={CLOUD_URL}>quoincloud.com</a>. The demos and the
        playground stay on this site.
      </p>
    </aside>
  );
}
