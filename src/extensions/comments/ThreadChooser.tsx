'use client';

import type { CommentsEnv } from './comments-env';

type ThreadChooserProps = {
  env: CommentsEnv;
  choices: readonly { id: string; anchorText: string; preview: string }[];
  onChoose(id: string): void;
};

/** The threads anchored to the text clicked, when there are several, to open one. */
export function ThreadChooser({ env, choices, onChoose }: ThreadChooserProps) {
  return (
    <ul aria-label={env.labels.threadsHere} className="flex flex-col gap-1">
      {choices.map(({ id, anchorText, preview }) => (
        <li key={id}>
          <button
            type="button"
            className="quoin-comments-choice"
            onClick={() => onChoose(id)}
          >
            <span className="quoin-comments-quote">{anchorText}</span>
            {preview && <span className="line-clamp-1 text-sm">{preview}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
