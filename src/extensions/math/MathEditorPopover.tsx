'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { useOutsidePress } from '../../blocks/image/use-outside-press';
import { bubblePart } from '../../menus/bubble/bubble-part';
import type { MenuSide, VirtualAnchor } from '../../menus/floating/virtual-anchor';
import { Button } from '../../ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import type { MathFeature } from './math-feature';
import { MathOutput } from './MathOutput';

type MathEditorPopoverProps = {
  controller: ViewController;
  feature: MathFeature;
  anchor: RefObject<VirtualAnchor | null>;
  side: MenuSide;
  latex: string;
  /** A block's display formula, stored with Mod+Enter, rather than a formula in a line, stored with Enter. */
  displayMode: boolean;
  /** Writes the LaTeX, `refocus` when focus is handed back right after. */
  onStore(latex: string, refocus: boolean): void;
  onClose(): void;
  /** Hands focus back to what the popover edits. */
  onReturn(): void;
};

const withMod = (event: KeyboardEvent, isMac: boolean): boolean =>
  isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;

/**
 * The LaTeX of a formula with a live preview. Save, Enter for a formula in a line (Shift+Enter breaks the line) or
 * Mod+Enter for a block (Enter breaks the line), and Tab out of either end store it and hand focus back; Escape hands
 * focus back keeping what was there. A press elsewhere, or a script moving focus elsewhere, stores it and leaves focus
 * where that puts it.
 */
export function MathEditorPopover(props: MathEditorPopoverProps) {
  const { controller, feature, anchor, side, latex, displayMode, onStore, onClose, onReturn } = props;
  const { labels } = feature;
  const [draft, setDraft] = useState(latex);
  const fieldId = useId();
  const closed = useRef(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const saveButton = useRef<HTMLButtonElement>(null);

  // Handing focus back is focus leaving the popover, which would close it a second time.
  const finish = (store: boolean, refocus = false) => {
    if (closed.current) return false;
    closed.current = true;
    if (store && draft !== latex) onStore(draft, refocus);
    return true;
  };
  const latestFinish = useRef(finish);
  latestFinish.current = finish;
  useEffect(() => {
    closed.current = false;
    return () => void latestFinish.current(true);
  }, []);

  // A tap gives the text focus and the caret before its click closes the popover, and the editor reads the caret only
  // on the next selection change, so it is read first: the store would otherwise draw the old caret back.
  const close = (store: boolean, refocus = true) => {
    if (!refocus) controller.readSelectionFromDom();
    if (!finish(store, refocus)) return;
    onClose();
    if (refocus) onReturn();
  };
  const content = useRef<HTMLDivElement>(null);
  const ownerDocument = useCallback(() => controller.root?.ownerDocument ?? document, [controller]);
  useOutsidePress(content, ownerDocument, () => close(true, false));
  const save = (event: FormEvent) => {
    event.preventDefault();
    close(true);
  };
  // Tab moves between the field and Save, which WebKit's own Tab skips, and out of either end stores the formula: the
  // popover is drawn at the end of the page, where Tab out of it would leave the page.
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (isComposingKey(controller, event.nativeEvent) || event.altKey) return;
    const fromField = event.target === field.current;
    if (event.key === 'Enter' && fromField && !event.shiftKey) {
      const mod = withMod(event, controller.isMac);
      if (displayMode ? !mod : event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      close(true);
    } else if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      event.stopPropagation();
      if (event.shiftKey === fromField) close(true);
      else (fromField ? saveButton : field).current?.focus();
    }
  };

  return (
    <Popover
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) close(true, false);
      }}
    >
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        ref={content}
        aria-label={labels.editEquation}
        side={side}
        align="start"
        className="w-96 max-w-[calc(100vw-2rem)] p-3"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          const end = field.current?.value.length ?? 0;
          field.current?.focus();
          field.current?.setSelectionRange(end, end);
        }}
        onCloseAutoFocus={preventDefault}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (!isComposingKey(controller, event)) close(false);
        }}
        {...bubblePart(controller)}
      >
        <form noValidate className="quoin-math-editor" onSubmit={save} onKeyDown={onKeyDown}>
          <label htmlFor={fieldId} className="text-sm font-medium">
            {labels.latex}
          </label>
          <textarea
            ref={field}
            id={fieldId}
            dir="ltr"
            rows={displayMode ? 4 : 2}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            className="quoin-math-field"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div role="group" aria-label={labels.preview} className="quoin-math-preview">
            <MathOutput feature={feature} latex={draft} displayMode={displayMode} />
          </div>
          <Button ref={saveButton} type="submit" size="sm">
            {labels.save}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
