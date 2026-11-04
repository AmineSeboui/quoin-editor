import type { ReactNode } from 'react';

export const SETTLE_DELAY = 300;

type Props = { screen: ReactNode; markdown: string };

/** The home page's sample document twice: as the editor shows it, and as the markdown file it is stored as. */
export function StorageWindow({ screen, markdown }: Props) {
  return (
    <div className="storage-window">
      <section className="storage-pane" aria-labelledby="screen-heading">
        <header className="pane-bar">
          <h2 id="screen-heading">On screen</h2>
        </header>
        <div className="pane-body pane-screen">{screen}</div>
      </section>
      <section className="storage-pane storage-disk" aria-labelledby="disk-heading">
        <header className="pane-bar">
          <h2 id="disk-heading">On disk</h2>
          <span className="pane-file">release-notes.md</span>
        </header>
        <pre className="pane-body" tabIndex={0} aria-label="The markdown file, a region that scrolls">
          {markdown}
        </pre>
        <p className="pane-note">What onChange hands you, once typing pauses for {SETTLE_DELAY} ms.</p>
      </section>
    </div>
  );
}
