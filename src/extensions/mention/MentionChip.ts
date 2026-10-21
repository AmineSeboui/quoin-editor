import type { AtomRenderer } from '../../view';
import type { MentionFeature } from './mention-feature';

/**
 * Draws a mention atom as `@` and its label, as text, with its kind in `data-kind` and in its description. A chip
 * opens on a click only when the host gave `onOpen`, and is never a link.
 */
export function mentionChipRenderer({ labels, onOpen }: MentionFeature): AtomRenderer {
  return (node, doc) => {
    const { label = '', kind } = node.attrs;
    const chip = doc.createElement('span');
    chip.className = 'quoin-mention';
    chip.textContent = `@${label}`;
    chip.setAttribute('aria-description', labels.mentionDescription(kind));
    if (kind !== undefined) chip.setAttribute('data-kind', kind);
    if (onOpen !== undefined) chip.setAttribute('data-opens', '');
    return chip;
  };
}
