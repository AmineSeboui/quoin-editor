import type { WidgetRenderer } from '../../view';
import type { PresenceLabels } from './presence-labels';

export const PRESENCE_CARET = 'presence-caret';

/** Draws a collaborator's caret: a line in their colour with their name, hidden from assistive technology. */
export function remoteCaret(labels: PresenceLabels): WidgetRenderer {
  return ({ attrs }, doc) => {
    const caret = doc.createElement('span');
    caret.className = 'quoin-presence-caret';
    caret.setAttribute('aria-hidden', 'true');
    if (attrs.style !== undefined) caret.setAttribute('style', attrs.style);
    if (attrs['data-idle'] !== undefined) caret.setAttribute('data-idle', '');
    const name = doc.createElement('span');
    name.className = 'quoin-presence-name';
    name.textContent = labels.caret(attrs['data-name'] ?? '');
    caret.append(name);
    return caret;
  };
}
