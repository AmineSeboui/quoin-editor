'use client';

import { ExternalLink, Pencil, Unlink } from 'lucide-react';
import { useMemo, useRef, type RefObject } from 'react';
import type { CanvasUiStore } from '../../canvas/ui-store';
import { sanitizeHref, textSelection } from '../../engine';
import type { QuoinLabels } from '../../i18n/labels';
import { Button } from '../../ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { ViewController } from '../../view';
import { useEditorState, wholeState } from '../../view/react/use-editor-state';
import { keepFocus } from '../floating/keep-focus';
import { rangeRect } from '../floating/range-rect';
import { virtualAnchor } from '../floating/virtual-anchor';
import { linkAtSelection } from './link-at-selection';
import { linkAtElement } from './link-element';
import { truncateMiddle } from './truncate-middle';
import { unlinkRange } from './unlink-range';
import { useCaretInLink } from './use-caret-in-link';
import { usePointerLink } from './use-pointer-link';
import { dispatchSelection } from '../../view/controller/dispatch-selection';

const REST_MS = 300;
const URL_LENGTH = 48;
const CARD = 'flex w-auto items-center gap-0.5 py-1 ps-3 pe-1 shadow-md';
const ADDRESS = 'me-1 whitespace-nowrap text-sm text-muted-foreground';

type LinkHoverCardProps = { controller: ViewController; labels: QuoinLabels; store: CanvasUiStore };

type LinkCardProps = LinkHoverCardProps & {
  cardRef: RefObject<HTMLDivElement | null>;
  element: HTMLAnchorElement | null;
  onUnlinked(): void;
};

function LinkCard({ controller, labels, store, cardRef, element, onUnlinked }: LinkCardProps) {
  const state = useEditorState(controller, wholeState);
  const link = useMemo(
    () => (element === null ? linkAtSelection(state) : linkAtElement(controller, state, element)),
    [controller, state, element],
  );
  const anchor = useMemo(() => {
    if (link === null) return { current: null };
    const { range } = link;
    const host = () => controller.registry.get(range.block, range.region);
    return { current: virtualAnchor(() => rangeRect(controller, range), host) };
  }, [controller, link]);
  if (link === null) return null;

  const { block, region, from, to } = link.range;
  const href = sanitizeHref(link.href);
  const address = truncateMiddle(link.href, URL_LENGTH);
  const edit = () => {
    if (element !== null) {
      const selection = textSelection({ block, region, offset: from }, { block, region, offset: to });
      dispatchSelection(controller, selection);
    }
    store.set({ linkPopover: { open: true } });
  };
  const unlink = () => {
    controller.run(unlinkRange(link.range));
    onUnlinked();
  };

  return (
    <Popover open modal={false}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        ref={cardRef}
        aria-label={labels.link}
        side="bottom"
        align="start"
        className={CARD}
        onOpenAutoFocus={preventDefault}
        onCloseAutoFocus={preventDefault}
        onPointerDown={keepFocus}
        onMouseDown={keepFocus}
      >
        <span className={ADDRESS} title={address === link.href ? undefined : link.href}>
          {address}
        </span>
        {href !== null && (
          <Button asChild variant="ghost" size="icon-sm">
            <a href={href} target="_blank" rel="noopener noreferrer" aria-label={labels.linkOpen}>
              <ExternalLink />
            </a>
          </Button>
        )}
        <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.linkEdit} onClick={edit}>
          <Pencil />
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={labels.linkRemove} onClick={unlink}>
          <Unlink />
        </Button>
      </PopoverContent>
    </Popover>
  );
}

/**
 * A card with a link's address and Open, Edit and Unlink, for the link the caret has rested in or the pointer has
 * rested on for 300 ms. It never takes focus, and pressing it leaves focus and the selection in the text.
 */
export function LinkHoverCard(props: LinkHoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const pointer = usePointerLink(props.controller, cardRef, REST_MS);
  const caretInLink = useCaretInLink(props.controller, REST_MS);
  if (pointer.element === null && !caretInLink) return null;
  return <LinkCard {...props} cardRef={cardRef} element={pointer.element} onUnlinked={pointer.dismiss} />;
}
