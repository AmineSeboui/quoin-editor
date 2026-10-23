'use client';

import { Check, ExternalLink, Unlink } from 'lucide-react';
import { useId, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { sanitizeHref } from '../../engine';
import { unsetLink } from '../../engine/commands/marks';
import { isCollapsed } from '../../engine/state/selection';
import type { QuoinLabels } from '../../i18n/labels';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { ViewController } from '../../view';
import { rangeRect } from '../floating/range-rect';
import { selectionRect } from '../floating/selection-rect';
import { virtualAnchor, type VirtualAnchor } from '../floating/virtual-anchor';
import { applyLink } from './apply-link';
import { linkAddress } from './link-address';
import { linkAtSelection, type LinkAtSelection } from './link-at-selection';

const CONTENT = 'w-80 p-2 shadow-md';
const FIELD = 'h-8';
const MESSAGE = 'mt-1.5 px-1 text-sm text-destructive';

// The selected text, or at a collapsed caret the link it is in, or the caret itself.
function popoverAnchor(controller: ViewController, link: LinkAtSelection | null): VirtualAnchor | null {
  const { selection } = controller.editor.state;
  if (selection?.kind !== 'text') return null;
  const { block, region, offset } = selection.head;
  const caret = link?.range ?? { block, region, from: offset, to: offset };
  const collapsed = isCollapsed(selection);
  return virtualAnchor(
    () => (collapsed ? rangeRect(controller, caret) : selectionRect(controller)),
    () => controller.registry.get(block, region),
  );
}

type LinkPopoverProps = { controller: ViewController; labels: QuoinLabels; onClose(): void };

/**
 * The link address of the selection, to apply on Enter: it links selected text, edits the link a caret is in, or
 * inserts the address as linked text at any other caret. An address the engine would not keep as a link is refused
 * with a message. Escape, Apply and Remove give focus back to the text with its selection.
 */
export function LinkPopover({ controller, labels, onClose }: LinkPopoverProps) {
  const [link] = useState(() => linkAtSelection(controller.editor.state));
  const [address, setAddress] = useState(link?.href ?? '');
  const [invalid, setInvalid] = useState(false);
  const messageId = useId();
  const anchor = useMemo(() => ({ current: popoverAnchor(controller, link) }), [controller, link]);
  const openHref = link && sanitizeHref(link.href);

  const backToText = () => {
    onClose();
    controller.focus();
  };
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAddress(event.target.value);
    setInvalid(false);
  };
  const apply = (event: FormEvent) => {
    event.preventDefault();
    const href = linkAddress(address);
    if (href === null) return setInvalid(true);
    controller.run(applyLink(href, address.trim()));
    backToText();
  };
  const remove = () => {
    controller.run(unsetLink);
    backToText();
  };

  return (
    <Popover
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        aria-label={labels.link}
        side="bottom"
        align="start"
        className={CONTENT}
        onCloseAutoFocus={preventDefault}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          backToText();
        }}
      >
        <form noValidate className="flex items-center gap-0.5" onSubmit={apply}>
          <Input
            type="url"
            className={FIELD}
            aria-label={labels.linkUrl}
            aria-invalid={invalid || undefined}
            aria-describedby={invalid ? messageId : undefined}
            value={address}
            onChange={onChange}
          />
          <Button type="submit" variant="ghost" size="icon-sm" aria-label={labels.linkApply}>
            <Check />
          </Button>
          {openHref && (
            <Button asChild variant="ghost" size="icon-sm">
              <a href={openHref} target="_blank" rel="noopener noreferrer" aria-label={labels.linkOpen}>
                <ExternalLink />
              </a>
            </Button>
          )}
          {link !== null && (
            <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.linkRemove} onClick={remove}>
              <Unlink />
            </Button>
          )}
        </form>
        {invalid && (
          <p id={messageId} role="alert" className={MESSAGE}>
            {labels.invalidLink}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
