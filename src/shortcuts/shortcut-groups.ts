import type { QuoinLabels, ShortcutGroupName } from '../i18n/labels';
import { formatShortcut } from './format-shortcut';

export type ShortcutRow = { label: string; keys: string };

export type ShortcutGroup = { name: ShortcutGroupName; title: string; items: ShortcutRow[] };

const HEADING_LEVELS = [1, 2, 3, 4, 5, 6];

/** The keyboard model as the shortcuts dialog lists it, group by group, each key written the way the platform does. */
export function shortcutGroups(labels: QuoinLabels, isMac: boolean): ShortcutGroup[] {
  const keys = (shortcut: string) => formatShortcut(shortcut, { isMac, labels });
  const row = (label: string, shortcut: string): ShortcutRow => ({ label, keys: keys(shortcut) });
  const { shortcutGroupNames: titles, shortcutNames: names, blockNames } = labels;
  return [
    {
      name: 'text',
      title: titles.text,
      items: [
        row(labels.bold, 'Mod-b'),
        row(labels.italic, 'Mod-i'),
        row(labels.underline, 'Mod-u'),
        row(labels.strike, 'Mod-Shift-s'),
        row(labels.code, 'Mod-e'),
        row(labels.highlight, 'Mod-Shift-h'),
        row(labels.link, 'Mod-k'),
        row(names.lineBreak, 'Shift-Enter'),
        row(labels.undo, 'Mod-z'),
        { label: labels.redo, keys: labels.keyAlternative(keys('Mod-Shift-z'), keys('Mod-y')) },
      ],
    },
    {
      name: 'blocks',
      title: titles.blocks,
      items: [
        row(names.splitBlock, 'Enter'),
        row(names.joinAbove, 'Backspace'),
        row(names.joinBelow, 'Delete'),
        row(blockNames.text, 'Mod-Alt-0'),
        ...HEADING_LEVELS.map((level) => row(labels.heading(level), `Mod-Alt-${level}`)),
        row(blockNames.numberedList, 'Mod-Shift-7'),
        row(blockNames.bulletedList, 'Mod-Shift-8'),
        row(blockNames.todoList, 'Mod-Shift-9'),
        row(names.flipBlock, 'Mod-Enter'),
        row(labels.indent, 'Tab'),
        row(labels.outdent, 'Shift-Tab'),
        row(labels.moveUp, 'Mod-Shift-ArrowUp'),
        row(labels.moveDown, 'Mod-Shift-ArrowDown'),
        row(labels.duplicate, 'Mod-d'),
      ],
    },
    {
      name: 'selection',
      title: titles.selection,
      items: [
        row(names.selectBlock, 'Escape'),
        row(names.openBlockEditor, 'Enter'),
        row(names.leaveBlockEditor, 'Escape'),
        row(names.selectAll, 'Mod-a'),
        row(names.extendUp, 'Shift-ArrowUp'),
        row(names.extendDown, 'Shift-ArrowDown'),
      ],
    },
    {
      name: 'navigation',
      title: titles.navigation,
      items: [
        row(names.lineUp, 'ArrowUp'),
        row(names.lineDown, 'ArrowDown'),
        row(names.previousBlockEnd, 'ArrowLeft'),
        row(names.nextBlockStart, 'ArrowRight'),
        { label: names.leaveEditor, keys: labels.keySequence(keys('Escape'), keys('Tab')) },
      ],
    },
    {
      name: 'menus',
      title: titles.menus,
      items: [
        row(labels.slashMenu, '/'),
        row(names.blockMenu, 'Mod-/'),
        row(labels.formattingToolbar, 'Alt-F10'),
        row(labels.shortcuts, 'Mod-Shift-/'),
        row(names.closeMenu, 'Escape'),
      ],
    },
  ];
}
