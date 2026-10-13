import type { Command } from '../commands/command';
import { setLink } from '../commands/marks';
import { isCollapsed } from '../state/selection';
import { loneUrl } from './paste-url';

export function pasteLinkOverSelection(text: string): Command {
  const url = loneUrl(text, 'linkable');
  const link = setLink(url ?? '');
  return (state, dispatch) => {
    const { selection } = state;
    if (url === null || selection?.kind !== 'text' || isCollapsed(selection)) return false;
    return link(state, dispatch && ((tr) => dispatch(tr.setOrigin('paste'))));
  };
}
