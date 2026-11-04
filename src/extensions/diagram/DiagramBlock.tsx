'use client';

import { useMemo } from 'react';
import { str } from '../../engine/blocks/data-fields';
import { CodeBlock } from '../../blocks/code/CodeBlock';
import type { BlockRenderer } from '../../view';
import type { DiagramFeature } from './diagram-feature';
import { isDiagramLanguage } from './diagram-languages';
import { renderedDiagram } from './rendered-diagram';

/**
 * A code block whose language the feature draws: the drawing above, and the code block itself below, so the source
 * stays where a writer already knows to edit it. The drawing is hidden from assistive technology, which reads the
 * source instead, and a drawing that cannot be made leaves the source alone.
 */
export function diagramRenderer(feature: DiagramFeature): BlockRenderer {
  return function DiagramOrCode({ block, controller }) {
    const language = str(block.attrs.language);
    const code = str(block.attrs.code);
    const draws = isDiagramLanguage(feature.languages, language);
    const markup = useMemo(
      () => (draws ? renderedDiagram(feature.render, code, language) : null),
      [draws, code, language],
    );

    if (!draws) return <CodeBlock block={block} controller={controller} />;
    return (
      <div role="group" aria-label={feature.labels.diagram(language)} className="quoin-diagram">
        {markup !== null && (
          <div aria-hidden="true" className="quoin-diagram-output" dangerouslySetInnerHTML={{ __html: markup }} />
        )}
        <CodeBlock block={block} controller={controller} />
      </div>
    );
  };
}
