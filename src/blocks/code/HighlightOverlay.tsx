'use client';

import { Fragment, useMemo, type ComponentPropsWithoutRef, type Ref } from 'react';
import { useQuoin } from '../../context';
import { highlightedLines, type CodeToken } from './code-highlighter';
import { tokenColour } from './token-colour';

function Token({ text, color, className }: CodeToken) {
  return (
    <span style={{ color: tokenColour(color) }} className={className}>
      {text}
    </span>
  );
}

type HighlightOverlayProps = Omit<ComponentPropsWithoutRef<'pre'>, 'className'> & {
  code: string;
  language: string;
  drawnRef?: Ref<HTMLPreElement>;
};

/**
 * The code of a block, drawn with the tokens of the canvas's `highlight`. It ends with a line break, so that a last empty
 * line takes its height, as it does in the text area drawn over it.
 */
export function HighlightOverlay({ code, language, drawnRef, ...props }: HighlightOverlayProps) {
  const { highlight } = useQuoin();
  const lines = useMemo(() => highlightedLines(highlight, code, language), [highlight, code, language]);
  return (
    <pre {...props} ref={drawnRef} className="quoin-code-text">
      <code>
        {lines === null
          ? code
          : lines.map((line, index) => (
              <Fragment key={index}>
                {index > 0 && '\n'}
                {line.map((token, at) => (
                  <Token key={at} {...token} />
                ))}
              </Fragment>
            ))}
      </code>
      {'\n'}
    </pre>
  );
}
