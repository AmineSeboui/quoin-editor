import { getPluginState, Transaction, type Command, type PluginKey, type PluginSpec } from '../../engine';
import { sameSelection } from '../../engine/state/selection';
import type { SuggestionRange } from '../../extensions/ui-types';
import { findTrigger, type ActiveTrigger, type TriggerConfig } from './find-trigger';

export type SuggestionState = { active: ActiveTrigger | null; dismissedAt: SuggestionRange | null };

const DISMISS = 'suggestion:dismiss';

const rangeOf = ({ block, region, from, to }: SuggestionRange): SuggestionRange => ({ block, region, from, to });

const sameRange = (a: SuggestionRange | null, b: SuggestionRange | null): boolean =>
  a === b || (a !== null && b !== null && a.block === b.block && a.region === b.region && a.from === b.from && a.to === b.to);

const sameTrigger = (a: ActiveTrigger | null, b: ActiveTrigger | null): boolean =>
  sameRange(a, b) && a?.query === b?.query;

// A dismissed trigger stays dismissed while the trigger character is where the transaction moved it and the caret is
// still after it, so the query can grow or shrink without the menu coming back.
function stillDismissed(tr: Transaction, dismissed: SuggestionRange, found: ActiveTrigger | null): SuggestionRange | null {
  if (found === null) return null;
  const at = tr.mapPos({ block: dismissed.block, region: dismissed.region, offset: dismissed.from });
  const same = found.block === at.block && found.region === at.region && found.from === at.offset;
  return same ? rangeOf(found) : null;
}

export function suggestionPlugin(key: PluginKey<SuggestionState>, config: TriggerConfig): PluginSpec<SuggestionState> {
  return {
    key,
    init: (state) => ({ active: findTrigger(state, config), dismissedAt: null }),
    apply(tr, value, oldState, newState) {
      const dismissing = tr.getMeta(DISMISS) === key.name;
      if (!dismissing && !tr.docChanged && sameSelection(oldState.selection, newState.selection)) return value;
      const found = findTrigger(newState, config);
      let dismissedAt: SuggestionRange | null = null;
      if (dismissing) dismissedAt = found && rangeOf(found);
      else if (value.dismissedAt !== null) dismissedAt = stillDismissed(tr, value.dismissedAt, found);
      const active = dismissedAt === null ? found : null;
      const unchanged = sameTrigger(active, value.active) && sameRange(dismissedAt, value.dismissedAt);
      if (unchanged) return value;
      return {
        active: sameTrigger(active, value.active) ? value.active : active,
        dismissedAt: sameRange(dismissedAt, value.dismissedAt) ? value.dismissedAt : dismissedAt,
      };
    },
  };
}

export function dismissSuggestion(key: PluginKey<SuggestionState>): Command {
  return (state, dispatch) => {
    if (getPluginState(state, key).active === null) return false;
    dispatch?.(new Transaction(state).setMeta(DISMISS, key.name));
    return true;
  };
}
