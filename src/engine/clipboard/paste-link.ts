import type { Command } from '../commands/command';
import { setLink } from '../commands/marks';
import { autolinkHref } from '../markdown/autolink-href';
import { isCollapsed } from '../state/selection';
import { loneUrl } from './paste-url';

export function pasteLinkOverSelection(text: string): Command {
  const url = loneUrl(text, 'linkable');
  const href = url === null ? null : autolinkHref(url);
  const link = setLink(href ?? '');
  return (state, dispatch) => {
    const { selection } = state;
    if (href === null || selection?.kind !== 'text' || isCollapsed(selection)) return false;
    return link(state, dispatch && ((tr) => dispatch(tr.setOrigin('paste'))));
  };
}
