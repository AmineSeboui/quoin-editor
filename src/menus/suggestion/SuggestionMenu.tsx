'use client';

import { useRef, type ReactNode } from 'react';
import type { PluginKey } from '../../engine';
import type { SuggestionRange } from '../../extensions/ui-types';
import { HIGHLIGHT_BAR } from '../../ui/focus';
import { MENU_CONTENT } from '../../ui/menu-styles';
import { Popover, PopoverAnchor, PopoverContent } from '../../ui/popover';
import { TAP_TARGET_FLOOR } from '../../ui/touch-target';
import { cn } from '../../ui/cn';
import type { ViewController } from '../../view';
import { useIsomorphicLayoutEffect } from '../../view/react/use-isomorphic-layout-effect';
import { keepFocus } from '../floating/keep-focus';
import { useRangeAnchor } from '../floating/use-range-anchor';
import type { SuggestionSection } from './group-items';
import type { SuggestionState } from './suggestion-plugin';
import { useSuggestion } from './use-suggestion';

export type SuggestionMenuProps<T> = {
  controller: ViewController;
  pluginKey: PluginKey<SuggestionState>;
  items: (query: string) => readonly T[] | Promise<readonly T[]>;
  itemKey(item: T): string;
  renderItem(item: T, active: boolean): ReactNode;
  groupOf?(item: T): string | null;
  onSelect(item: T, range: SuggestionRange): void;
  label: string;
  emptyLabel: string;
};

// The listbox scrolls rather than the popover around it, so the scrolling region is the combobox's own popup, whose
// options the arrows reach while focus stays in the text.
const CONTENT = cn(
  MENU_CONTENT,
  'flex w-72 max-h-[min(22rem,var(--radix-popper-available-height))] flex-col overflow-y-hidden',
);
const LISTBOX = 'min-h-0 overflow-y-auto';
const GROUP_LABEL = 'px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground';
const OPTION = cn(
  'relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm',
  'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground',
  HIGHLIGHT_BAR,
  TAP_TARGET_FLOOR,
);

const preventDefault = (event: Event) => event.preventDefault();

type OptionProps = { id: string; active: boolean; onHighlight(): void; onChoose(): void; children: ReactNode };

function SuggestionOption({ id, active, onHighlight, onChoose, children }: OptionProps) {
  return (
    <div
      role="option"
      id={id}
      aria-selected={active}
      data-highlighted={active ? '' : undefined}
      className={OPTION}
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
      onPointerMove={onHighlight}
      onClick={onChoose}
    >
      {children}
    </div>
  );
}

type SectionProps<T> = {
  section: SuggestionSection<T>;
  labelId: string;
  activeIndex: number;
  optionId(item: T): string;
  renderItem(item: T, active: boolean): ReactNode;
  highlight(index: number): void;
  select(index: number): void;
};

function SuggestionGroup<T>({ section, labelId, activeIndex, optionId, renderItem, highlight, select }: SectionProps<T>) {
  const options = section.entries.map(({ item, index }) => (
    <SuggestionOption
      key={optionId(item)}
      id={optionId(item)}
      active={index === activeIndex}
      onHighlight={() => highlight(index)}
      onChoose={() => select(index)}
    >
      {renderItem(item, index === activeIndex)}
    </SuggestionOption>
  ));
  if (section.label === null) return <>{options}</>;
  return (
    <div role="group" aria-labelledby={labelId}>
      <div role="presentation" id={labelId} className={GROUP_LABEL}>
        {section.label}
      </div>
      {options}
    </div>
  );
}

/** A listbox of suggestions for the trigger at the caret, which keeps focus in the text as a combobox's popup does. */
export function SuggestionMenu<T>(props: SuggestionMenuProps<T>) {
  const { controller, renderItem, label, emptyLabel } = props;
  const suggestion = useSuggestion(props);
  const { trigger, sections, activeIndex, listboxId } = suggestion;
  const { anchor, side } = useRangeAnchor(controller, trigger);
  const listbox = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    listbox.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, sections]);

  if (trigger === null) return null;
  const inEditor = (node: unknown) => node instanceof Node && controller.root?.contains(node) === true;
  // Radix settles a press outside at its click and ignores focus that moves meanwhile, so a press in the editor that
  // left focus outside it, as the gutter handle does when it opens the block menu, closes the menu as well.
  const insideEditor = (event: { target: EventTarget | null; preventDefault(): void }) => {
    const focused = controller.root?.ownerDocument.activeElement ?? null;
    const focusStays = focused === null || focused === focused.ownerDocument.body || inEditor(focused);
    if (inEditor(event.target) && focusStays) event.preventDefault();
  };
  const empty = sections.length === 0 && !suggestion.pending;
  return (
    <Popover
      open
      modal={false}
      onOpenChange={(open) => {
        // Focus moves out while another overlay mounts, inside that edit's commit, so the dismiss waits for it to end.
        if (!open) queueMicrotask(suggestion.dismiss);
      }}
    >
      <PopoverAnchor virtualRef={anchor} />
      <PopoverContent
        // Radix makes the content a dialog; the listbox inside it is the popup the text controls.
        role={undefined}
        side={side}
        align="start"
        className={CONTENT}
        onOpenAutoFocus={preventDefault}
        onCloseAutoFocus={preventDefault}
        onEscapeKeyDown={preventDefault}
        onPointerDownOutside={insideEditor}
        onFocusOutside={insideEditor}
      >
        <div ref={listbox} role="listbox" id={listboxId} aria-label={label} className={LISTBOX}>
          {sections.map((section, index) => (
            <SuggestionGroup
              key={section.label ?? ''}
              section={section}
              labelId={`${listboxId}-group-${index}`}
              activeIndex={activeIndex}
              optionId={suggestion.optionId}
              renderItem={renderItem}
              highlight={suggestion.highlight}
              select={suggestion.select}
            />
          ))}
        </div>
        {empty && <p className="px-2 py-1.5 text-sm text-muted-foreground">{emptyLabel}</p>}
      </PopoverContent>
    </Popover>
  );
}
