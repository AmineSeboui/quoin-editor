import type { QuoinLabels } from '../../i18n/labels';
import { Bold, Code, Italic, Strikethrough, Subscript, Superscript, Underline } from '../../icons';
import type { KitItem } from '../../toolbar/toolbar-button';
import { linkItem, markItem } from '../../toolbar/toolbar-items';
import { MARK_SHORTCUTS } from '../../shortcuts/mark-shortcuts';

export type BubbleItems = { inline: readonly KitItem[]; scripts: readonly KitItem[] };

/** The toolbar's own buttons: the marks and Link, which go before the menus, and the scripts, which go after them. */
export function bubbleItems(labels: QuoinLabels, openLink: () => void): BubbleItems {
  return {
    inline: [
      markItem('bold', labels.bold, Bold, MARK_SHORTCUTS.bold),
      markItem('italic', labels.italic, Italic, MARK_SHORTCUTS.italic),
      markItem('underline', labels.underline, Underline, MARK_SHORTCUTS.underline),
      markItem('strike', labels.strike, Strikethrough, MARK_SHORTCUTS.strike),
      markItem('code', labels.code, Code, MARK_SHORTCUTS.code),
      linkItem(labels, openLink),
    ],
    scripts: [markItem('sub', labels.subscript, Subscript), markItem('sup', labels.superscript, Superscript)],
  };
}
