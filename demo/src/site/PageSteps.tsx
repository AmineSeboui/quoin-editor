import type { Page } from './pages';
import { pageHref } from './site';

type Props = { previous?: Page; next?: Page };

/** The pages either side of this one in the guide, so it can be read straight through. */
export function PageSteps({ previous, next }: Props) {
  if (!previous && !next) return null;
  return (
    <nav className="page-steps" aria-label="Previous and next page">
      {previous && (
        <a className="page-step" href={pageHref(previous.path)} rel="prev">
          <span>Previous</span>
          {previous.title}
        </a>
      )}
      {next && (
        <a className="page-step page-step-next" href={pageHref(next.path)} rel="next">
          <span>Next</span>
          {next.title}
        </a>
      )}
    </nav>
  );
}
