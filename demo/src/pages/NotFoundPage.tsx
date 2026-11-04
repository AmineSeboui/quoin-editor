import { demoPages, guidePages, referencePages } from '../site/pages';
import { pageHref } from '../site/site';

const ELSEWHERE = [guidePages[0], ...demoPages.slice(0, 2), ...referencePages.slice(-1)];

export function NotFoundPage() {
  return (
    <section className="not-found">
      <p className="not-found-code">404</p>
      <h1>That page is not here</h1>
      <p className="lede">
        The address may have changed with a release, or it may never have existed. The whole guide is a key press away:
        press <kbd>/</kbd> to search it.
      </p>
      <ul className="not-found-links">
        {ELSEWHERE.map((page) => (
          <li key={page.path}>
            <a href={pageHref(page.path)}>{page.title}</a>
          </li>
        ))}
        <li>
          <a href={pageHref('')}>Home</a>
        </li>
      </ul>
    </section>
  );
}
