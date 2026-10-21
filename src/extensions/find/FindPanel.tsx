'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { keyName, normalizeKey, redo, undo, type Command } from '../../engine';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import type { ViewController } from '../../view';
import { findActions } from './find-actions';
import type { FindLabels } from './find-labels';
import { currentMatch, type FindState } from './find-state';
import { FindStatus } from './FindStatus';
import { FindToggles } from './FindToggles';
import { isFindShortcut } from './use-find-shortcut';
import { useScrollToCurrent } from './use-scroll-to-current';

type Props = { controller: ViewController; labels: FindLabels; value: FindState; readOnly: boolean };

const composing = (event: KeyboardEvent) => event.nativeEvent.isComposing || event.keyCode === 229;

const focusAll = (field: HTMLInputElement | null) => {
  field?.focus();
  field?.select();
};

const HISTORY: readonly [string, Command][] = [
  ['Mod-z', undo],
  ['Mod-Shift-z', redo],
  ['Mod-y', redo],
];

const historyCommand = (event: KeyboardEvent, isMac: boolean): Command | undefined =>
  HISTORY.find(([key]) => normalizeKey(key, isMac) === keyName(event, isMac))?.[1];

const plainEnter = (event: KeyboardEvent) => event.key === 'Enter' && !event.altKey && !event.ctrlKey && !event.metaKey;

/**
 * The query, its options and the replacement, with the count of matches and the means to step through them and replace
 * them. It is not modal: the canvas stays editable, and only Escape or its close button closes it. Undo and redo pressed
 * on its buttons undo and redo in the editor, keeping focus in the panel.
 */
export function FindPanel({ controller, labels, value, readOnly }: Props) {
  const actions = useMemo(() => findActions(controller), [controller]);
  const [replacement, setReplacement] = useState('');
  const panel = useRef<HTMLDivElement>(null);
  const query = useRef<HTMLInputElement>(null);
  useEffect(() => focusAll(query.current), [value.opened]);
  useScrollToCurrent(controller, panel, currentMatch(value));

  const onPanelKeyDown = (event: KeyboardEvent) => {
    if (composing(event)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      actions.close();
    } else if (isFindShortcut(event, controller.isMac)) {
      event.preventDefault();
      focusAll(query.current);
    } else {
      // Focus stays in the panel after a replace, where the editor's keymap never hears the keys; a field keeps its own.
      const command = historyCommand(event, controller.isMac);
      if (command === undefined || readOnly || (event.target as Element).matches('input')) return;
      event.preventDefault();
      command(controller.editor.state, (tr) => controller.editor.dispatch(tr));
    }
  };
  // WebKit leaves focus on the page after a click on a button, where Escape and the history keys would go nowhere.
  const onPanelClick = (event: MouseEvent) => {
    const button = (event.target as Element).closest('button');
    if (button !== null && button.ownerDocument.activeElement === button.ownerDocument.body) button.focus();
  };
  const onQueryKeyDown = (event: KeyboardEvent) => {
    if (composing(event) || !plainEnter(event)) return;
    event.preventDefault();
    actions.step(event.shiftKey ? -1 : 1);
  };
  const onReplaceKeyDown = (event: KeyboardEvent) => {
    if (composing(event) || !plainEnter(event) || event.shiftKey) return;
    event.preventDefault();
    actions.replace(replacement);
  };

  return (
    <div
      ref={panel}
      role="search"
      aria-label={labels.findAndReplace}
      className="quoin quoin-find-panel bg-popover fixed top-4 right-4 z-50 max-w-[calc(100vw-2rem)] text-popover-foreground flex flex-col gap-1.5 rounded-md border p-2 shadow-md"
      onKeyDown={onPanelKeyDown}
      onClick={onPanelClick}
    >
      <div className="flex flex-wrap items-center gap-1">
        <Input
          ref={query}
          aria-label={labels.find}
          placeholder={labels.find}
          value={value.search.query}
          aria-invalid={value.error !== null}
          onChange={(event) => actions.search(event.target.value)}
          onKeyDown={onQueryKeyDown}
          className="h-8 w-48"
        />
        <FindStatus labels={labels} value={value} />
        <FindToggles labels={labels} options={value.search} onToggle={actions.toggle} />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={labels.previousMatch}
          title={labels.previousMatch}
          onClick={() => actions.step(-1)}
        >
          <ChevronUp aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={labels.nextMatch}
          title={labels.nextMatch}
          onClick={() => actions.step(1)}
        >
          <ChevronDown aria-hidden />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={labels.close}
          title={labels.close}
          onClick={actions.close}
        >
          <X aria-hidden />
        </Button>
      </div>
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1">
          <Input
            aria-label={labels.replaceWith}
            placeholder={labels.replaceWith}
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            onKeyDown={onReplaceKeyDown}
            className="h-8 w-48"
          />
          <Button type="button" variant="outline" size="sm" onClick={() => actions.replace(replacement)}>
            {labels.replace}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => actions.replaceAll(replacement)}>
            {labels.replaceAll}
          </Button>
        </div>
      )}
    </div>
  );
}
