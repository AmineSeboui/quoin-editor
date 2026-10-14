import type { ViewController } from '../controller/view-controller';
import { readDomText } from '../dom/read-dom-text';
import { renderInline } from '../dom/render-inline';

// Text the browser wrote into the empty document's host becomes the first paragraph, typed through insertText so input
// rules apply. Whatever else it left there, such as the break a cancelled composition leaves, is drawn over.
export function commitEmptyHost(controller: ViewController): void {
  const host = controller.emptyHost;
  if (host === null) return;
  const text = readDomText(host);
  if (text !== '' && controller.edit(() => controller.editor.insertText(text))) controller.focus();
  else renderInline(host, [], []);
}
