import { useId, useRef } from 'react';
import type { ViewController } from '../controller/view-controller';
import { BlockShell } from './BlockShell';
import type { BlockRenderer } from './block-renderer-types';
import { QuoinEditorContext } from './editor-context';
import { EmptyDocumentHost } from './EmptyDocumentHost';
import { LiveRegion } from './LiveRegion';
import { SelectionSink } from './SelectionSink';
import { useEditorState } from './use-editor-state';
import { useIsomorphicLayoutEffect } from './use-isomorphic-layout-effect';

export type EditorViewProps = {
  controller: ViewController;
  renderers?: Readonly<Record<string, BlockRenderer>>;
  className?: string;
  id?: string;
  'aria-label'?: string;
  placeholder?: string;
};

const NO_RENDERERS: Readonly<Record<string, BlockRenderer>> = {};
const HINT = 'Type / for commands. Press Escape, then Tab, to leave the editor.';

export function EditorView({
  controller,
  renderers = NO_RENDERERS,
  className,
  id,
  'aria-label': label,
  placeholder,
}: EditorViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const blocks = useEditorState(controller, (state) => state.doc.blocks);

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
        {blocks.length === 0 ? (
          <EmptyDocumentHost placeholder={placeholder} />
        ) : (
          blocks.map((block, index) => (
            <BlockShell key={block.id} block={block} index={index} renderers={renderers} />
          ))
        )}
        <SelectionSink />
        <div id={hintId} className="quoin-visually-hidden">
          {HINT}
        </div>
        <LiveRegion />
      </div>
    </QuoinEditorContext.Provider>
  );
}
