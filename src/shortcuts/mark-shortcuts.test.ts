import { englishLabels } from '../i18n/english-labels';
import { bubbleItems } from '../menus/bubble/bubble-items';
import { formatShortcut } from './format-shortcut';
import { MARK_SHORTCUTS } from './mark-shortcuts';
import { shortcutGroups } from './shortcut-groups';

describe('the keys of the marks', () => {
  it('are the ones the toolbar buttons show', () => {
    const { inline } = bubbleItems(englishLabels, () => {});
    expect(Object.fromEntries(inline.map((item) => [item.id, item.shortcut]))).toEqual({
      bold: MARK_SHORTCUTS.bold,
      italic: MARK_SHORTCUTS.italic,
      underline: MARK_SHORTCUTS.underline,
      strike: MARK_SHORTCUTS.strike,
      code: MARK_SHORTCUTS.code,
      link: MARK_SHORTCUTS.link,
    });
  });

  it('are the ones the shortcuts dialog lists', () => {
    const rows = shortcutGroups(englishLabels, true).find((group) => group.name === 'text')!.items;
    const keysOf = (label: string) => rows.find((row) => row.label === label)!.keys;
    expect(keysOf(englishLabels.bold)).toBe(formatShortcut(MARK_SHORTCUTS.bold, { isMac: true }));
    expect(keysOf(englishLabels.link)).toBe(formatShortcut(MARK_SHORTCUTS.link, { isMac: true }));
  });
});
