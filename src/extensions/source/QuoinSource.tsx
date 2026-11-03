'use client';

import { Fragment, useMemo, type ComponentPropsWithoutRef } from 'react';
import type { ViewController } from '../../view';
import { resolveSourceLabels, type SourceLabels } from './source-labels';
import { useEditorSource, type SourceOptions } from './use-editor-source';

export type QuoinSourceProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  controller: ViewController;
  /** How the markdown is written. Pass what the canvas was given, so the pane reads as the document is stored. */
  options?: SourceOptions;
  /** Every string the pane shows or speaks, English by default. A key left out stays English. */
  labels?: Partial<SourceLabels>;
};

/**
 * The document of `controller` as the markdown it is stored as, read only, with the block holding the caret marked.
 * Place it beside or below the canvas; the controller is the one a `BlockCanvas` handle gives.
 */
export function QuoinSource({ controller, options, labels: given, className, ...props }: QuoinSourceProps) {
  const labels = useMemo(() => resolveSourceLabels(given), [given]);
  const { markdown, active } = useEditorSource(controller, options);
  const lines = useMemo(() => (markdown === '' ? [] : markdown.replace(/\n$/, '').split('\n')), [markdown]);

  return (
    <div
      {...props}
      role="region"
      aria-label={labels.region}
      tabIndex={0}
      className={className === undefined ? 'quoin-source' : `quoin-source ${className}`}
    >
      <pre className="quoin-source-text">
        {/* The line break sits outside the run, so a marked line is tinted to its end and no further. */}
        {lines.map((line, index) => (
          <Fragment key={index}>
            <span
              data-quoin-source-line={index}
              className={active && index >= active.from && index <= active.to ? 'quoin-source-active' : undefined}
            >
              {line}
            </span>
            {'\n'}
          </Fragment>
        ))}
      </pre>
    </div>
  );
}
