'use client';

import { useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import { useLabels } from '../../i18n/use-labels';
import { bubblePart } from '../../menus/bubble/bubble-part';
import type { VirtualAnchor } from '../../menus/floating/virtual-anchor';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { setBlockAttrs } from '../text/set-block-attrs';

const preventDefault = (event: Event) => event.preventDefault();

type AltTextPopoverProps = {
  blockId: string;
  controller: ViewController;
  anchor: RefObject<VirtualAnchor | null>;
  alt: string;
  onClose(): void;
};

/**
 * The alt text of an image, asked for as required. Enter, Save and a click away store it, Escape keeps the one the image
 * had, and focus goes back to the image either way.
 */
export function AltTextPopover({ blockId, controller, anchor, alt, onClose }: AltTextPopoverProps) {
  const labels = useLabels();
  const [draft, setDraft] = useState(alt);
  const fieldId = useId();
  const hintId = `${fieldId}-hint`;
  const closed = useRef(false);

  // Handing focus back to the image is focus leaving the popover, which would close it a second time, storing the text.
  const close = (store: boolean) => {
    if (closed.current) return;
    closed.current = true;
    if (store && draft !== alt) setBlockAttrs(controller, blockId, { alt: draft });
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
