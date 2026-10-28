'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react';
import { setAttrs } from '../../engine/commands/block-style';
import { blockById } from '../../engine/model/doc';
import { useLabels } from '../../i18n/use-labels';
import { bubblePart, isBubblePart } from '../../menus/bubble/bubble-part';
import type { VirtualAnchor } from '../../menus/floating/virtual-anchor';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { onBlock } from '../../view/react/block-command';
import { str } from '../../engine/blocks/data-fields';
import { useOutsidePress } from './use-outside-press';

type AltTextPopoverProps = {
  blockId: string;
  controller: ViewController;
  anchor: RefObject<VirtualAnchor | null>;
  opener: RefObject<HTMLElement | null>;
  alt: string;
  decorative: boolean;
  onClose(): void;
};

// The text is also stored as the popover goes, whatever takes it down, such as the caret of a tap being read into the
// text or a host moving the selection off the image: on the editor itself, since the canvas's flush is refused in an
// effect. A canvas being taken down has let go of its root first, and takes no more writes. A host change that also
// moved the selection takes the popover down before it is drawn with the new alt text, which the draft must not replace.
function storeAlt(controller: ViewController, blockId: string, opened: string, patch: Record<string, unknown>): void {
  const { editor } = controller;
  const current = blockById(editor.state.doc, blockId)?.attrs.alt;
  if (controller.readOnly || controller.root === null || str(current) !== opened) return;
  onBlock(blockId, setAttrs(patch))(editor.state, (tr) => editor.dispatch(tr));
}

/**
 * The alt text of an image, asked for as required. Enter, Save, and Tab or Shift+Tab out of it store it and hand focus
 * back to the image, and Escape hands focus back keeping the alt text the image had. A press elsewhere, or a script
 * moving focus elsewhere, stores it and leaves focus where that puts it; a press on the image's toolbar or handles
 * hands focus back to the image. A press on the button that opened it is left to that button. It closes, storing
 * nothing, once the alt text changes under it.
 */
export function AltTextPopover({ blockId, controller, anchor, opener, alt, decorative, onClose }: AltTextPopoverProps) {
  const labels = useLabels();
  const [opened] = useState(alt);
  const [draft, setDraft] = useState(alt);
  const [marked, setMarked] = useState(decorative);
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const closed = useRef(false);

  // Handing focus back to the image is focus leaving the popover, which would close it a second time.
  const finish = (store: boolean) => {
    if (closed.current) return false;
    closed.current = true;
    if (store && (draft !== alt || marked !== decorative))
      storeAlt(controller, blockId, opened, { alt: draft, decorative: marked || undefined });
    return true;
  };
  const latestFinish = useRef(finish);
  latestFinish.current = finish;
  useEffect(() => {
    closed.current = false;
    return () => void latestFinish.current(true);
  }, []);
  useEffect(() => {
    if (alt !== opened && finish(false)) onClose();
  });

  // A tap gives the text focus and the caret before its click closes the popover, and the editor reads the caret only on
  // the next selection change. It is read first, or storing the text would hand focus back to the image.
  const close = (store: boolean, refocus = true) => {
    if (!refocus) controller.readSelectionFromDom();
    if (!finish(store)) return;
    onClose();
    if (refocus) controller.focus();
  };
  const content = useRef<HTMLDivElement>(null);
  const ownerDocument = useCallback(() => controller.root?.ownerDocument ?? document, [controller]);
  useOutsidePress(content, ownerDocument, (target) => {
    if (!opener.current?.contains(target)) close(true, isBubblePart(target, controller));
  });
  const save = (event: FormEvent) => {
    event.preventDefault();
    close(true);
  };
  // Tab moves between the field, the checkbox and Save, which WebKit's own Tab skips, and out of either end stores the text: the
  // popover is drawn at the end of the page, where Tab out of it would leave the page. The popover's own focus scope
  // would wrap Tab round instead.
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Tab' || isComposingKey(controller, event.nativeEvent)) return;
    const controls = [...event.currentTarget.elements];
    const next = controls[controls.indexOf(event.target as Element) + (event.shiftKey ? -1 : 1)];
    event.preventDefault();
    event.stopPropagation();
    if (next === undefined) close(true);
    else (next as HTMLElement).focus();
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
        aria-label={labels.altText}
        side="bottom"
        className="w-80 p-3"
        onCloseAutoFocus={preventDefault}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (!isComposingKey(controller, event)) close(false);
        }}
        {...bubblePart(controller)}
      >
        <form noValidate className="quoin-image-alt" onSubmit={save} onKeyDown={onKeyDown}>
          <label htmlFor={fieldId} className="text-sm font-medium">
            {labels.altText}
          </label>
          <Input
            id={fieldId}
            required={!marked}
            aria-describedby={hintId}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setMarked(false);
            }}
          />
          <p id={hintId} className="quoin-block-message">
            {labels.altTextHint}
          </p>
          <label className="quoin-image-decorative text-sm">
            <input
              type="checkbox"
              checked={marked}
              onChange={(event) => {
                setMarked(event.target.checked);
                if (event.target.checked) setDraft('');
              }}
            />
            {labels.decorativeImage}
          </label>
          <Button type="submit" size="sm">
            {labels.save}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
