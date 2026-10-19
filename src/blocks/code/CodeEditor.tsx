'use client';

import { useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import type { EngineBlock } from '../../engine';
import { useLabels } from '../../i18n/use-labels';
import type { ViewController } from '../../view';
import { NATIVE_INTERACTION } from '../../view/selection/native-interaction';
import { str } from '../str';
import { selectNode } from '../void/select-node';
import { useVoidEditing } from '../void/use-void-editing';
import { writeCode } from './code-actions';
import { codeKeyAction } from './code-keys';
import { HighlightOverlay } from './HighlightOverlay';
import { runCodeAction } from './run-code-action';

let sessions = 0;

type CodeEditorProps = {
  block: EngineBlock;
  controller: ViewController;
  field: RefObject<HTMLTextAreaElement | null>;
  focusControls(): void;
};

/**
 * The code of a block typed in place: a transparent text area over the highlighted code. The block is the selected one
 * while its code has focus, and Enter on the selected block, or a menu that inserts it, puts focus in the code.
 */
export function CodeEditor({ block, controller, field, focusControls }: CodeEditorProps) {
  const labels = useLabels();
  const group = useRef('');
  const { editing, stop } = useVoidEditing(controller, block.id);
  const blockId = block.id;

  useEffect(() => {
    if (!editing) return;
    field.current?.focus();
    stop();
  }, [editing, stop, field]);

  const write = (value: string) => writeCode(controller, blockId, value, group.current);
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const area = event.currentTarget;
    if (event.nativeEvent.isComposing) return;
    const action = codeKeyAction(event, { value: area.value, start: area.selectionStart, end: area.selectionEnd }, controller.isMac);
    if (action !== null && runCodeAction(action, { controller, blockId, area, write, focusControls })) event.preventDefault();
  };

  return (
    <div {...{ [NATIVE_INTERACTION]: '' }} dir="ltr" className="quoin-code-scroll">
      <div className="quoin-code-lines">
        <HighlightOverlay aria-hidden="true" code={str(block.attrs.code)} language={str(block.attrs.language)} />
        <textarea
          ref={field}
          aria-label={labels.codeText}
          aria-keyshortcuts="Alt+F10"
          value={str(block.attrs.code)}
          wrap="off"
          tabIndex={-1}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="quoin-code-text quoin-code-input"
          onFocus={() => {
            sessions += 1;
            group.current = `code:${blockId}:${sessions}`;
            selectNode(controller, blockId);
          }}
          onChange={(event) => write(event.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}
