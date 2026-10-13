import type { Command } from '../commands/command';
import { setLink } from '../commands/marks';
import { isCollapsed } from '../state/selection';
import { pastedLink } from './paste-url';

export function pasteLinkOverSelection(text: string): Command {
  const href = pastedLink(text, 'linkable')?.href ?? null;
  const link = setLink(href ?? '');
  return (state, dispatch) => {
    const { selection } = state;
    if (href === null || selection?.kind !== 'text' || isCollapsed(selection)) return false;
    return link(state, dispatch && ((tr) => dispatch(tr.setOrigin('paste'))));
  };
}
