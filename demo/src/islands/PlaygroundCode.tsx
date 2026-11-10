import { useEffect, useState } from 'react';

const CONFIRM_FOR = 1600;

export function PlaygroundCode({ source }: { source: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), CONFIRM_FOR);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () => {
    navigator.clipboard?.writeText(source).then(
      () => setCopied(true),
      (error: unknown) => console.error('The snippet was not copied.', error),
    );
  };

  return (
    <section className="play-pane play-source" aria-labelledby="play-code-heading">
      <div className="pane-bar">
        <h2 id="play-code-heading">The code behind it</h2>
        <button type="button" className="play-copy" onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="play-code" tabIndex={0}>
        <code>{source}</code>
      </pre>
    </section>
  );
}
