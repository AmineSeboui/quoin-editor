'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { setAttrs } from '../../engine/commands/block-style';
import { useLabels } from '../../i18n/use-labels';
import { bubblePart } from '../../menus/bubble/bubble-part';
import type { VirtualAnchor } from '../../menus/floating/virtual-anchor';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { onBlock } from '../../view/react/block-command';

type AltTextPopoverProps = {
  blockId: string;
  controller: ViewController;
  anchor: RefObject<VirtualAnchor | null>;
  alt: string;
  onClose(): void;
};

// The toolbar can take the popover down when focus or a press leaves the editor, before the popover hears of it, so
// the text is also stored as the popover goes: on the editor itself, since the canvas's flush is refused in an effect.
// A canvas being taken down has let go of its root first, and takes no more writes.
function storeAlt(controller: ViewController, blockId: string, alt: string): void {
  const { editor } = controller;
  if (controller.readOnly || controller.root === null) return;
  onBlock(blockId, setAttrs({ alt }))(editor.state, (tr) => editor.dispatch(tr));
}

/**
 * The alt text of an image, asked for as required. Enter, Save, Tab and a click away store it, Escape keeps the one the
 * image had, and closing it hands focus back to the image.
 */
export function AltTextPopover({ blockId, controller, anchor, alt, onClose }: AltTextPopoverProps) {
  const labels = useLabels();
  const [draft, setDraft] = useState(alt);
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const closed = useRef(false);

  // Handing focus back to the image is focus leaving the popover, which would close it a second time.
  const finish = (store: boolean) => {
    if (closed.current) return false;
    closed.current = true;
    if (store && draft !== alt) storeAlt(controller, blockId, draft);
    return true;
  };
  const latestFinish = useRef(finish);
  latestFinish.current = finish;
  useEffect(() => () => void latestFinish.current(true), []);

  const close = (store: boolean) => {
    if (!finish(store)) return;
    onClose();
    controller.focus();
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    close(true);
  };

  return (
    <Popover
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) close(true);
      }}
    >
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
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
        <form noValidate className="quoin-image-alt" onSubmit={save}>
          <label htmlFor={fieldId} className="text-sm font-medium">
            {labels.altText}
          </label>
          <Input
            id={fieldId}
            required
            aria-describedby={hintId}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <p id={hintId} className="quoin-image-message">
            {labels.altTextHint}
          </p>
          <Button type="submit" size="sm">
            {labels.save}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
