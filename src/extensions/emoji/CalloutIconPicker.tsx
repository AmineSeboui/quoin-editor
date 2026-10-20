'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useOutsidePress } from '../../blocks/image/use-outside-press';
import { usePartAnchor } from '../../blocks/void/block-part';
import type { EditorState } from '../../engine';
import { setAttrs } from '../../engine/commands/block-style';
import { noChange, runOnBlocks } from '../../gutter/run-on-blocks';
import { bubblePart } from '../../menus/bubble/bubble-part';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { ViewController } from '../../view';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import { allCallouts } from './all-callouts';
import { isComposing } from './composing-key';
import type { EmojiLabels } from './emoji-labels';
import { EmojiPicker } from './EmojiPicker';
import { requestIcon, useIconRequest, type IconRequest } from './icon-request';

type Props = { controller: ViewController; labels: EmojiLabels };

// The icon button a callout draws first, which the picker opens under.
const CALLOUT_ICON = '.quoin-callout > :first-child';

/** The picker a callout's Choose icon opened, while its callouts are still there and the canvas is editable. */
export function CalloutIconPicker({ controller, labels }: Props) {
  const readOnly = useReadOnly(controller);
  const request = useIconRequest(controller);
  const there = useEditorState(
    controller,
    useCallback((state: EditorState) => request !== null && allCallouts(state, request.blocks), [request]),
  );
  const shown = request !== null && there && !readOnly;
  useEffect(() => {
    if (request !== null && !shown) requestIcon(controller, null);
  }, [controller, request, shown]);
  if (!shown) return null;
  return <IconPopover key={request.blocks.join(' ')} controller={controller} labels={labels} request={request} />;
}

/**
 * Enter or a click on an emoji writes it to the icon of the callouts in one step, and Escape keeps their icon; either
 * hands focus back to the callout. A press outside closes the picker and leaves focus where the press puts it.
 */
function IconPopover({ controller, labels, request: { blocks } }: Props & { request: IconRequest }) {
  const anchor = usePartAnchor(controller, blocks[0], CALLOUT_ICON);
  const content = useRef<HTMLDivElement>(null);
  const close = () => requestIcon(controller, null);
  const finish = (icon: string | null) => {
    close();
    runOnBlocks(controller, blocks, icon === null ? noChange : setAttrs({ icon }));
    controller.focus();
  };
  const ownerDocument = useCallback(() => controller.root?.ownerDocument ?? document, [controller]);
  useOutsidePress(content, ownerDocument, close);

  return (
    <Popover
      open
      modal={false}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        ref={content}
        aria-label={labels.chooseIcon}
        side="bottom"
        align="start"
        className="w-80 p-2"
        onCloseAutoFocus={preventDefault}
        onEscapeKeyDown={(event) => {
          event.preventDefault();
          if (!isComposing(event)) finish(null);
        }}
        {...bubblePart(controller)}
      >
        <EmojiPicker labels={labels} onPick={finish} />
      </PopoverContent>
    </Popover>
  );
}
