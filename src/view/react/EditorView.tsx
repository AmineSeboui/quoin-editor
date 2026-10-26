import { useId, useRef, type ReactNode } from 'react';
import type { ViewController } from '../controller/view-controller';
import type { BlockLabel } from '../selection/selection-sink';
import { BlockDomIdScope } from './block-dom-id';
import { BlockPlaceholderContext, headingPlaceholder, type BlockPlaceholder } from './block-placeholder';
import type { BlockRenderer } from './block-renderer-types';
import { QuoinEditorContext } from './editor-context';
import { EmptyDocumentHost } from './EmptyDocumentHost';
import { focusOwners } from './focus-owners';
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
  /** The name of a block selected as a whole, such as an image's alt text, in place of `selectedContentLabel`. */
  blockLabel?: BlockLabel;
  /** The text and accessible name of a block whose type no renderer draws, in place of the English one. */
  unsupportedBlockLabel?: string;
  /** The text of the host an empty document draws. */
  placeholder?: string;
  /** The placeholder of each empty block, by default the name of a heading and nothing for other blocks. */
  blockPlaceholder?: BlockPlaceholder;
  /** What the live region says when blocks are selected, given how many it draws, in place of the English words. */
  blocksSelectedLabel?: (count: number) => string;
  /** Controls drawn over the blocks, such as a gutter, positioned against the editor's root. */
  children?: ReactNode;
};

const NO_RENDERERS: Readonly<Record<string, BlockRenderer>> = {};
const HINT = 'Press Escape, then Tab, to leave the editor.';
const BLOCKS_SELECTED = (count: number) => `${count} ${count === 1 ? 'block' : 'blocks'} selected`;

export function EditorView({
  controller,
  renderers = NO_RENDERERS,
  className,
  id,
  'aria-label': label = 'Editor',
  hint = HINT,
  paragraphLabel,
  selectedContentLabel,
  blockLabel,
  unsupportedBlockLabel = UNSUPPORTED_BLOCK,
  placeholder,
  blockPlaceholder = headingPlaceholder,
  blocksSelectedLabel = BLOCKS_SELECTED,
  children,
}: EditorViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const hintId = useId();
  const blockIdScope = useId();
  const blocks = useEditorState(controller, (state) => state.doc.blocks);
  const shells = useBlockElements(blocks, renderers);

  useIsomorphicLayoutEffect(() => (root.current ? controller.attach(root.current) : undefined), [controller]);

  return (
    <QuoinEditorContext.Provider value={controller}>
      <div
        ref={root}
        id={id}
        className={['quoin', 'quoin-editor', className].filter(Boolean).join(' ')}
        role="group"
        aria-label={label}
        aria-describedby={hintId}
        onFocusCapture={(event) => focusOwners.set(event.target, controller)}
      >
        <BlockDomIdScope.Provider value={blockIdScope}>
          <UnsupportedBlockLabel.Provider value={unsupportedBlockLabel}>
            <BlockPlaceholderContext.Provider value={blockPlaceholder}>
              {blocks.length === 0 ? <EmptyDocumentHost placeholder={placeholder} label={paragraphLabel} /> : shells}
            </BlockPlaceholderContext.Provider>
          </UnsupportedBlockLabel.Provider>
        </BlockDomIdScope.Provider>
        {children}
        <SelectionSink label={selectedContentLabel} blockLabel={blockLabel} />
        <div id={hintId} className="quoin-visually-hidden">
          {hint}
        </div>
        <LiveRegion blocksSelected={blocksSelectedLabel} />
        <SelectionWriter />
      </div>
    </QuoinEditorContext.Provider>
  );
}
