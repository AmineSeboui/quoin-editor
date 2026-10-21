'use client';

import { useCallback, useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import type { EngineBlock } from '../../engine';
import { useLabels } from '../../i18n/use-labels';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { NATIVE_INTERACTION } from '../../view/selection/native-interaction';
import { str } from '../str';
import { selectNode } from '../void/select-node';
import { useVoidEditing } from '../void/use-void-editing';
import { writeCode } from './code-actions';
import type { CodeField } from './code-edits';
import { applyCodeEdit, fieldOf } from './code-field';
import { codeKeyAction } from './code-keys';
import { HighlightOverlay } from './HighlightOverlay';
import { revealCaret } from './reveal-caret';
import { runCodeAction } from './run-code-action';
import { useTypeIntoCode } from './use-type-into-code';

let sessions = 0;

type CodeEditorProps = {
  block: EngineBlock;
  controller: ViewController;
  field: RefObject<HTMLTextAreaElement | null>;
  focusControls(): void;
};

/**
 * The code of a block typed in place: a transparent text area over the highlighted code. The block is the selected one
 * while its code has focus. Enter on the selected block, a menu that inserts it and a change that turns a block into it
 * put the caret at the end of the code.
 */
export function CodeEditor({ block, controller, field, focusControls }: CodeEditorProps) {
  const labels = useLabels();
  const group = useRef('');
  const drawn = useRef<HTMLPreElement>(null);
  const mark = useRef<HTMLSpanElement>(null);
  const { editing, stop } = useVoidEditing(controller, block.id);
  const blockId = block.id;

  const reveal = useCallback(() => {
    if (field.current !== null && drawn.current !== null && mark.current !== null) {
      revealCaret(field.current, drawn.current, mark.current);
    }
  }, [field]);

  useEffect(() => {
    const area = field.current;
    if (!editing || area === null) return;
    area.focus();
    area.setSelectionRange(area.value.length, area.value.length);
    reveal();
    stop();
  }, [editing, stop, field, reveal]);

  const edit = useCallback(
    (next: CodeField) => {
      const area = field.current;
      if (area === null) return;
      applyCodeEdit(area, next, (value) => writeCode(controller, blockId, value, group.current));
      reveal();
    },
    [controller, blockId, field, reveal],
  );
  useTypeIntoCode(controller, blockId, field, edit);
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const area = event.currentTarget;
    if (isComposingKey(controller, event.nativeEvent)) return;
    const action = codeKeyAction(event, fieldOf(area), controller.isMac);
    if (action !== null && runCodeAction(action, { controller, blockId, area, edit, focusControls })) event.preventDefault();
  };

  return (
    <div {...{ [NATIVE_INTERACTION]: '' }} dir="ltr" className="quoin-code-scroll">
      <div className="quoin-code-lines">
        <HighlightOverlay
          aria-hidden="true"
          drawnRef={drawn}
          code={str(block.attrs.code)}
          language={str(block.attrs.language)}
        />
        <span ref={mark} aria-hidden="true" className="quoin-code-caret" />
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
          onChange={(event) => writeCode(controller, blockId, event.target.value, group.current)}
          onKeyDown={onKeyDown}
        />
      </div>
    </div>
  );
}
