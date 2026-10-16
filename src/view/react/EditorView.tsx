import { useId, useRef } from 'react';
import type { ViewController } from '../controller/view-controller';
import type { BlockRenderer } from './block-renderer-types';
import { QuoinEditorContext } from './editor-context';
import { EmptyDocumentHost } from './EmptyDocumentHost';
import { LiveRegion } from './LiveRegion';
import { SelectionSink } from './SelectionSink';
import { SelectionWriter } from './SelectionWriter';
import { useBlockElements } from './use-block-elements';
import { useEditorState } from './use-editor-state';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

export type EditorViewProps = {
  controller: ViewController;
  renderers?: Readonly<Record<string, BlockRenderer>>;
  /** Draws a block whose type no renderer covers, in place of a box naming its type. */
  fallback?: BlockRenderer;
  className?: string;
  id?: string;
  'aria-label'?: string;
  /** What the editor's accessible description says, in place of the English way out. */
  hint?: string;
  /** The accessible name of the paragraph an empty document offers to type into. */
  paragraphLabel?: string;
  /** The accessible name of the hidden textbox that holds a selection across blocks. */
  selectedContentLabel?: string;
  placeholder?: string;
};

const NO_RENDERERS: Readonly<Record<string, BlockRenderer>> = {};
const HINT = 'Press Escape, then Tab, to leave the editor.';

export function EditorView({
  controller,
  renderers = NO_RENDERERS,
  fallback,
  className,
  id,
  'aria-label': label = 'Editor',
  hint = HINT,
  paragraphLabel,
  selectedContentLabel,
  placeholder,
}: EditorViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const blocks = useEditorState(controller, (state) => state.doc.blocks);
  const shells = useBlockElements(blocks, renderers, fallback);

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
        {blocks.length === 0 ? <EmptyDocumentHost placeholder={placeholder} label={paragraphLabel} /> : shells}
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
