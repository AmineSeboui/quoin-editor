import { homeDocument } from '../content/home-document';
import { Island } from '../site/Island';
import { guidePages } from '../site/pages';
import { pageHref, REPO_URL, TAGLINE } from '../site/site';

const source = (path: string) => `${REPO_URL}/blob/main/${path}`;

const PROOFS = [
  {
    title: 'Markdown on disk',
    text: 'Each text block stores its markdown. Blocks you never edit are never rewritten: onChange hands them back as the objects you supplied.',
    tests: ['src/engine/blocks/codec.test.ts'],
  },
  {
    title: 'A controlled input',
    text: 'A document is a QuoinBlock[] of plain JSON, passed as blocks and returned through onChange, so saving and versioning stay in your code.',
    tests: ['src/canvas/BlockCanvas.contract.test.tsx'],
  },
  {
    title: 'Tested with the keyboard and axe',
    text: 'In CI, axe runs over the canvas and its menus in light and dark mode, and a document is written with the keyboard alone.',
    tests: ['e2e/tests/canvas/a11y.spec.ts', 'e2e/tests/canvas/keyboard-only.spec.ts'],
  },
];

export function HomePage() {
  return (
    <>
      <section className="hero">
        <h1>{TAGLINE}</h1>
        <p className="lede">
          Quoin is a block editor for React that keeps every text block as readable markdown inside a typed array you hold in
          your own state. Writers get live formatting, a slash menu and drag handles; you get a document you can save, diff in
          git or hand to an LLM without a conversion step. MIT licensed.
        </p>
        <pre className="install">
          <code>npm install quoin-editor</code>
        </pre>
        <p className="hero-links">
          <a className="button" href={pageHref(guidePages[0].path)}>
            Get started
          </a>
          <a href={pageHref('blocks/')}>See every block</a>
        </p>
      </section>
      <Island name="home" blocks={homeDocument} />
      <section className="proofs" aria-labelledby="proofs-heading">
        <h2 id="proofs-heading">What holds it up</h2>
        <ul>
          {PROOFS.map(({ title, text, tests }) => (
            <li key={title}>
              <h3>{title}</h3>
              <p>{text}</p>
              <p className="proof-source">
                Checked by{' '}
                {tests.map((test, index) => (
                  <span key={test}>
                    {index > 0 && ' and '}
                    <a href={source(test)}>{test}</a>
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
