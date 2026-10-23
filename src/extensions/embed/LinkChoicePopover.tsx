'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { EditorState } from '../../engine';
import { regionLength } from '../../engine/commands/block-helpers';
import { blockById } from '../../engine/model/doc';
import { primaryRegion } from '../../engine/state/selection';
import type { NewBlock } from '../../blocks/insert-blocks';
import { useOutsidePress } from '../../blocks/image/use-outside-press';
import { bubblePart } from '../../menus/bubble/bubble-part';
import { useRovingFocus } from '../../menus/bubble/use-roving-focus';
import { keepFocus } from '../../menus/floating/keep-focus';
import { useFocusKey } from '../../menus/floating/use-focus-key';
import { useRangeAnchor } from '../../menus/floating/use-range-anchor';
import { Button } from '../../ui/button';
import { inlineDirection } from '../../ui/direction';
import { FLOATING_TOOLBAR } from '../../ui/menu-styles';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { preventDefault } from '../../ui/prevent-default';
import type { KeyInterceptor, ViewController } from '../../view';
import { isComposingKey } from '../../view/input/keydown';
import { useEditorState } from '../../view/react/use-editor-state';
import { useReadOnly } from '../../view/react/use-read-only';
import type { SuggestionRange } from '../ui-types';
import type { EmbedFeature } from './embed-feature';
import { bookmarkOf, embedOf } from './link-blocks';
import { linkChoice, replaceLink, type LinkChoice } from './link-choice';
import { interceptKeys } from '../../view/input/intercept-keys';

type Props = { controller: ViewController; feature: EmbedFeature };

const plainKey = (event: KeyboardEvent | globalThis.KeyboardEvent) => !event.altKey && !event.ctrlKey && !event.metaKey;

// The end of the link, where the caret is, so that the choice sits after it, clear of the card a caret resting in a
// link opens under it.
function linkEnd({ doc, schema }: EditorState, blockId: string): SuggestionRange | null {
  const block = blockById(doc, blockId);
  const region = block && primaryRegion(schema, block);
  const end = block && region ? regionLength(block, region) : 0;
  return block && region ? { block: blockId, region, from: end, to: end } : null;
}

/**
 * The choice offered next to a link pasted alone on an empty line: Embed, when a provider frames it, Bookmark, or Keep
 * as link. It never takes focus: Alt+F10 moves into it, the arrows walk it, and Escape, from it or from the text, keeps
 * the link, as a press outside it or any edit does.
 */
export function LinkChoicePopover({ controller, feature }: Props) {
  const readOnly = useReadOnly(controller);
  const choice = useEditorState(controller, linkChoice);
  const [dismissed, setDismissed] = useState<LinkChoice | null>(null);
  const dismiss = useCallback(() => setDismissed(choice), [choice]);
  if (readOnly || choice === null || choice === dismissed) return null;
  return <LinkChoiceToolbar controller={controller} feature={feature} choice={choice} onDismiss={dismiss} />;
}

type ToolbarProps = Props & { choice: LinkChoice; onDismiss(): void };

function useEscapeInText(controller: ViewController, onEscape: () => void): void {
  useEffect(() => {
    const intercept: KeyInterceptor = (event) => {
      if (event.key !== 'Escape' || !plainKey(event) || event.shiftKey) return false;
      event.preventDefault();
      onEscape();
      return true;
    };
    return interceptKeys(controller, intercept);
  }, [controller, onEscape]);
}

function LinkChoiceToolbar({ controller, feature: { labels, providers }, choice, onDismiss }: ToolbarProps) {
  const embed = useMemo(() => embedOf(choice.href, providers), [choice.href, providers]);
  const range = useMemo(() => linkEnd(controller.editor.state, choice.block), [controller, choice.block]);
  const { anchor } = useRangeAnchor(controller, range);
  const after = useMemo(() => {
    const host = range && controller.registry.get(range.block, range.region);
    return host && inlineDirection(host) === 'rtl' ? 'left' : 'right';
  }, [controller, range]);
  const roving = useRovingFocus();
  const rovingRef = roving.ref;
  const content = useRef<HTMLDivElement | null>(null);
  const ref = useCallback(
    (element: HTMLDivElement | null) => {
      content.current = element;
      rovingRef(element);
    },
    [rovingRef],
  );
  const ownerDocument = useCallback(() => controller.root?.ownerDocument ?? document, [controller]);
  useFocusKey(controller, roving.focusCurrent);
  useEscapeInText(controller, onDismiss);
  useOutsidePress(content, ownerDocument, onDismiss);

  const choose = (block: NewBlock | null) => {
    if (block === null) onDismiss();
    else controller.run(replaceLink(choice.block, block));
    controller.focus();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!roving.owns(event.target) || isComposingKey(controller, event.nativeEvent)) return;
    if (event.key === 'Escape') onDismiss();
    if (event.key === 'Escape' || (event.key === 'Tab' && plainKey(event))) {
      event.preventDefault();
      controller.focus();
    } else roving.onKeyDown(event);
  };
  const button = (label: string, block: NewBlock | null) => (
    <Button type="button" variant="ghost" size="sm" onClick={() => choose(block)}>
      {label}
    </Button>
  );

  return (
    <Popover open modal={false}>
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        ref={ref}
        role="toolbar"
        aria-label={labels.linkOptions}
        side={after}
        align="end"
        sideOffset={8}
        className={FLOATING_TOOLBAR}
        onOpenAutoFocus={preventDefault}
        onCloseAutoFocus={preventDefault}
        onPointerDown={keepFocus}
        onMouseDown={keepFocus}
        onFocus={roving.onFocus}
        onKeyDown={onKeyDown}
        {...bubblePart(controller)}
      >
        {embed !== null && button(labels.embed, embed)}
        {button(labels.bookmark, bookmarkOf(choice.href))}
        {button(labels.keepAsLink, null)}
      </PopoverContent>
    </Popover>
  );
}
