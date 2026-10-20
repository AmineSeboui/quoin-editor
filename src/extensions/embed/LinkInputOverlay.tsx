'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useOutsidePress } from '../../blocks/image/use-outside-press';
import { insertBlockToWrite, type NewBlock } from '../../blocks/insert-blocks';
import { bubblePart } from '../../menus/bubble/bubble-part';
import { useRangeAnchor } from '../../menus/floating/use-range-anchor';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { useReadOnly } from '../../view/react/use-read-only';
import type { EmbedFeature } from './embed-feature';
import { typedLink, type LinkProblem } from './link-blocks';
import { requestLink, useLinkRequest, type LinkRequest } from './link-request';
import { storeAfterPress } from './store-after-press';

type Props = { controller: ViewController; feature: EmbedFeature };

/** The link the Embed and Bookmark commands of the slash menu ask for, while one of them asks. */
export function LinkInputOverlay({ controller, feature }: Props) {
  const readOnly = useReadOnly(controller);
  const request = useLinkRequest(controller);
  const close = useCallback(() => requestLink(controller, null), [controller]);
  useEffect(() => {
    if (readOnly) close();
  }, [readOnly, close]);
  if (readOnly || request === null) return null;
  return <LinkInputPopover controller={controller} feature={feature} request={request} onClose={close} />;
}

type PopoverProps = Props & { request: LinkRequest; onClose(): void };

/**
 * Enter places the link as an embed or a bookmark, and Escape asks no more; either gives focus back to the line. A
 * press outside, or Tab out of either end, places a valid link and drops any other. An address that is no web address
 * is refused with a message, as is a link no provider frames, which can be bookmarked instead.
 */
function LinkInputPopover({ controller, feature: { labels, providers }, request, onClose }: PopoverProps) {
  const [address, setAddress] = useState('');
  const [problem, setProblem] = useState<LinkProblem | null>(null);
  const messageId = useId();
  const content = useRef<HTMLDivElement>(null);
  const { anchor, side } = useRangeAnchor(controller, request.at);
  const name = request.kind === 'embed' ? labels.embedLink : labels.bookmarkLink;
  const typed = () => typedLink(request.kind, address, providers);

  const finish = (block: NewBlock | null) => {
    onClose();
    if (block !== null && !controller.readOnly) controller.run(insertBlockToWrite(block, false, request.at.block));
    controller.focus();
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const { block, problem: refused } = typed();
    if (block === null) setProblem(refused);
    else finish(block);
  };
  const bookmarkInstead = () => finish(typedLink('bookmark', address, providers).block);
  const ownerDocument = useCallback(() => controller.root?.ownerDocument ?? document, [controller]);
  useOutsidePress(content, ownerDocument, () => {
    onClose();
    const { block } = typed();
    if (block !== null) setTimeout(() => storeAfterPress(controller, request, block));
  });
  // WebKit's own Tab skips buttons, and the popover is drawn at the end of the page, where Tab would leave the page.
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    if (isComposingKey(controller, event.nativeEvent)) return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('input, button')];
    const next = controls.indexOf(event.target as HTMLElement) + (event.shiftKey ? -1 : 1);
    event.preventDefault();
    if (next >= 0 && next < controls.length) controls[next].focus();
    else finish(typed().block);
  };

  return (
    <Popover open modal={false}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        ref={content}
        aria-label={name}
        side={side}
        align="start"
        className="w-80 p-2 shadow-md"
        onCloseAutoFocus={preventDefault}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (!isComposingKey(controller, event)) finish(null);
        }}
        {...bubblePart(controller)}
      >
        <form noValidate className="quoin-embed-ask" onSubmit={submit} onKeyDown={onKeyDown}>
          <Input
            type="url"
            className="h-8"
            aria-label={name}
            aria-invalid={problem !== null || undefined}
            aria-describedby={problem === null ? undefined : messageId}
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setProblem(null);
            }}
          />
          <Button type="submit" size="sm">
            {request.kind === 'embed' ? labels.embed : labels.bookmark}
          </Button>
          {problem !== null && (
            <p id={messageId} role="alert" className="quoin-embed-ask-message">
              {labels[problem]}
            </p>
          )}
          {problem === 'cannotEmbed' && (
            <Button type="button" variant="outline" size="sm" onClick={bookmarkInstead}>
              {labels.bookmarkInstead}
            </Button>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
}
