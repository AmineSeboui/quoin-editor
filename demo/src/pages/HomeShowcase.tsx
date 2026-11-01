import { BASE, pageHref } from '../site/site';

type Reel = {
  id: string;
  title: string;
  text: string;
  note?: string;
  clip: string;
  alt: string;
  demo: string;
  guide: string;
};

const REELS: Reel[] = [
  {
    id: 'collaboration',
    title: 'Write together in real time',
    text: 'Two people, one document. Each sees the other’s typing, ticked tasks and moved blocks arrive as they happen, with a named caret showing where they are. Quoin syncs through your own Yjs provider, and comment threads stay anchored to the text they discuss.',
    clip: 'quoin-collaboration.gif',
    alt: 'Two editors side by side, Ada and Grace. Ada adds a task while her caret shows in Grace’s copy, Grace renames the heading and ticks a task, and Ada drags a block that moves in both.',
    demo: 'collaboration/',
    guide: 'docs/collaboration/',
  },
  {
    id: 'ai',
    title: 'AI that writes into the document',
    text: 'Select text and ask AI to fix, rewrite, shorten, translate or continue it. The answer streams in as markdown beside the original, and one click accepts or discards it, in a single undo step. Quoin never calls a model: you pass it a stream from the one you use.',
    note: 'The recording answers from the demo’s simulated model.',
    clip: 'quoin-ai.gif',
    alt: 'A draft line with spelling mistakes is selected, Ask AI is opened from the toolbar and Fix spelling and grammar streams a corrected line that is accepted, then Continue writing adds a sentence below.',
    demo: 'ai/',
    guide: 'docs/ai/',
  },
];

/** The two features the home page films: collaboration and AI, each with its recording and links to try and read more. */
export function HomeShowcase() {
  return (
    <div className="showcase">
      {REELS.map(({ id, title, text, note, clip, alt, demo, guide }) => (
        <section key={id} className="reel" aria-labelledby={`${id}-heading`}>
          <div className="reel-copy">
            <h2 id={`${id}-heading`}>{title}</h2>
            <p>{text}</p>
            {note && <p className="reel-note">{note}</p>}
            <p className="reel-links">
              <a className="button" href={pageHref(demo)}>
                Try it live
              </a>
              <a className="text-link" href={pageHref(guide)}>
                How it works
              </a>
            </p>
          </div>
          <img className="reel-clip" src={`${BASE}${clip}`} alt={alt} width={1280} height={720} loading="lazy" decoding="async" />
        </section>
      ))}
    </div>
  );
}
