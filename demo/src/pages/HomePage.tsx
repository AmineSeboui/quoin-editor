import { toMarkdown } from 'quoin-editor/engine';
import { QuoinView } from 'quoin-editor/view';
import { homeDocument } from '../content/home-document';
import { resolveAssetUrl } from '../site/asset-url';
import { CheckIcon, CopyIcon } from '../site/icons';
import { Island } from '../site/Island';
import { guidePages } from '../site/pages';
import { pageHref, TAGLINE } from '../site/site';
import { StorageWindow } from '../site/StorageWindow';
import { HomeFeatures } from './HomeFeatures';
import { HomeShowcase } from './HomeShowcase';

const INSTALL = 'npm install quoin-editor';

const TAGLINE_LINES = TAGLINE.split(/(?<=\.) /);

export function HomePage() {
  return (
    <>
      <section className="hero">
        <h1>
          {TAGLINE_LINES.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </h1>
        <p className="lede">
          Quoin is a block editor for React that keeps every text block as readable markdown inside a typed array you hold in
          your own state. Writers get live formatting, a slash menu, drag handles, real-time co-editing and AI that writes
          into the page; you get a document you can save, diff in git or hand to an LLM without a conversion step. MIT
          licensed.
        </p>
        <div className="hero-actions">
          <a className="button" href={pageHref(guidePages[0].path)}>
            Get started
          </a>
          <div className="install">
            <code>{INSTALL}</code>
            <button type="button" className="icon-button copy-button" data-copy={INSTALL} aria-label="Copy install command" hidden>
              <CopyIcon />
              <CheckIcon />
            </button>
          </div>
          <a className="text-link" href={pageHref('blocks/')}>
            See every block
          </a>
        </div>
      </section>
      <Island
        name="home"
        blocks={homeDocument}
        fallback={
          <StorageWindow
            screen={<QuoinView blocks={homeDocument} resolveAssetUrl={resolveAssetUrl} className="island-fallback" />}
            markdown={toMarkdown(homeDocument)}
          />
        }
      />
      <HomeShowcase />
      <HomeFeatures />
    </>
  );
}
