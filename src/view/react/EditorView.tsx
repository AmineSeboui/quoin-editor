import { useId, useRef } from 'react';
import type { ViewController } from '../controller/view-controller';
import { BlockDomIdScope } from './block-dom-id';
import type { BlockRenderer } from './block-renderer-types';
import { QuoinEditorContext } from './editor-context';
import { EmptyDocumentHost } from './EmptyDocumentHost';
import { LiveRegion } from './LiveRegion';
import { SelectionSink } from './SelectionSink';
import { SelectionWriter } from './SelectionWriter';
import { UNSUPPORTED_BLOCK, UnsupportedBlockLabel } from './unsupported-block-label';
import { useBlockElements } from './use-block-elements';
import { useEditorState } from './use-editor-state';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

export type EditorViewProps = {
  controller: ViewController;
  renderers?: Readonly<Record<string, BlockRenderer>>;
  className?: string;
  id?: string;
  'aria-label'?: string;
  /** What the editor's accessible description says, in place of the English way out. */
  hint?: string;
  /** The accessible name of the paragraph an empty document offers to type into. */
  paragraphLabel?: string;
  /** The accessible name of the hidden textbox that holds a selection across blocks. */
  selectedContentLabel?: string;
  /** The text and accessible name of a block whose type no renderer draws, in place of the English one. */
  unsupportedBlockLabel?: string;
  placeholder?: string;
};

const NO_RENDERERS: Readonly<Record<string, BlockRenderer>> = {};
const HINT = 'Press Escape, then Tab, to leave the editor.';

export function EditorView({
  controller,
  renderers = NO_RENDERERS,
  className,
  id,
  'aria-label': label = 'Editor',
  hint = HINT,
  paragraphLabel,
  selectedContentLabel,
  unsupportedBlockLabel = UNSUPPORTED_BLOCK,
  placeholder,
}: EditorViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const blockIdScope = useId();
  const blocks = useEditorState(controller, (state) => state.doc.blocks);
  const shells = useBlockElements(blocks, renderers);

  useIsomorphicLayoutEffect(() => (root.current === null ? undefined : controller.attach(root.current)), [controller]);

  return (
    <QuoinEditorContext.Provider value={controller}>
      <div
        ref={root}
        id={id}
        className={['quoin', 'quoin-editor', className].filter(Boolean).join(' ')}
        role="group"
        aria-label={label}
        aria-describedby={hintId}
      >
        <BlockDomIdScope.Provider value={blockIdScope}>
          <UnsupportedBlockLabel.Provider value={unsupportedBlockLabel}>
            {blocks.length === 0 ? <EmptyDocumentHost placeholder={placeholder} label={paragraphLabel} /> : shells}
          </UnsupportedBlockLabel.Provider>
        </BlockDomIdScope.Provider>
        <SelectionSink label={selectedContentLabel} />
        <div id={hintId} className="quoin-visually-hidden">
          {hint}
        </div>
        <LiveRegion />
        <SelectionWriter />
      </div>
    </QuoinEditorContext.Provider>
  );
}
