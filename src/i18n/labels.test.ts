import { englishLabels, resolveLabels, type QuoinLabels } from './labels';

const KEYS = Object.keys(englishLabels) as (keyof QuoinLabels)[];

const NAMED_ARGUMENTS: Partial<Record<keyof QuoinLabels, unknown[]>> = {
  callout: ['Warning'],
  calloutToneMenu: ['Warning'],
  undoHint: ['Ctrl+Z'],
  keySequence: ['Escape', 'Tab'],
};

function sampleText(key: keyof QuoinLabels): string[] {
  const label = englishLabels[key];
  if (typeof label === 'string') return [label];
  if (typeof label === 'function') return [(label as (...args: unknown[]) => string)(...(NAMED_ARGUMENTS[key] ?? [2, 5]))];
  return Object.values(label);
}

describe('resolveLabels', () => {
  it('is the English labels when the host overrides nothing', () => {
    expect(resolveLabels()).toEqual(englishLabels);
    expect(resolveLabels({})).toEqual(englishLabels);
  });

  it('takes the label a host overrides and keeps English for every other key', () => {
    const labels = resolveLabels({ bold: 'Gras' });
    expect(labels.bold).toBe('Gras');
    for (const key of KEYS.filter((name) => name !== 'bold')) expect(labels[key]).toBe(englishLabels[key]);
  });

  it('keeps English for a key the host passes as undefined', () => {
    expect(resolveLabels({ bold: undefined }).bold).toBe('Bold');
  });

  it('takes a worded label as a function of its value', () => {
    const labels = resolveLabels({ heading: (level) => `Titre ${level}` });
    expect(labels.heading(2)).toBe('Titre 2');
    expect(labels.numberedItem(3)).toBe('Numbered list item 3');
  });

  it('leaves the English labels untouched', () => {
    resolveLabels({ bold: 'Gras' });
    expect(englishLabels.bold).toBe('Bold');
  });
});

describe('englishLabels', () => {
  it('words the labels the editor already speaks', () => {
    expect(englishLabels.document).toBe('Editor');
    expect(englishLabels.editorHint).toBe('Press Escape, then Tab, to leave the editor.');
    expect(englishLabels.heading(2)).toBe('Heading 2');
    expect(englishLabels.callout('warning')).toBe('Callout, warning');
    expect(englishLabels.paragraph).toBe('Paragraph');
    expect(englishLabels.selectedContent).toBe('Selected content');
    expect(englishLabels.close).toBe('Close');
  });

  it('names the Edit button of void blocks and the blocks no definition draws', () => {
    expect(englishLabels.editBlock('Bookmark')).toBe('Edit Bookmark');
    expect(englishLabels.unsupportedBlock).toBe('Unsupported block');
  });

  it('names a callout after the name of its tone, in lower case after the comma', () => {
    expect(englishLabels.callout(englishLabels.calloutTones.warning)).toBe('Callout, warning');
    expect(englishLabels.calloutTones).toEqual({
      info: 'Info',
      tip: 'Tip',
      success: 'Success',
      warning: 'Warning',
      danger: 'Danger',
    });
  });

  it('names the icon button and the tone menu of a callout, the tone menu with its visible tone', () => {
    expect(englishLabels.calloutIcon).toBe('Callout icon');
    expect(englishLabels.calloutToneMenu('Warning')).toBe('Callout tone: Warning');
  });

  it('says on a toggle button how many blocks it hides, in the singular for one', () => {
    expect(englishLabels.toggleButton(0)).toBe('Toggle');
    expect(englishLabels.toggleButton(1)).toBe('Toggle, 1 block hidden');
    expect(englishLabels.toggleButton(3)).toBe('Toggle, 3 blocks hidden');
  });

  it('counts one selected block in the singular and more in the plural', () => {
    expect(englishLabels.blocksSelected(1)).toBe('1 block selected');
    expect(englishLabels.blocksSelected(3)).toBe('3 blocks selected');
  });

  it('names every palette colour and every slash menu group', () => {
    expect(Object.keys(englishLabels.colors)).toHaveLength(10);
    expect(Object.keys(englishLabels.groups)).toHaveLength(7);
  });

  it('names the block types a block turns into, the callout submenus and a finished copy', () => {
    expect(englishLabels.blockNames).toEqual({
      text: 'Text',
      bulletedList: 'Bulleted list',
      numberedList: 'Numbered list',
      todoList: 'To-do list',
      quote: 'Quote',
      callout: 'Callout',
      toggle: 'Toggle',
      code: 'Code',
      divider: 'Divider',
      image: 'Image',
      file: 'File',
    });
    expect([englishLabels.tone, englishLabels.icon, englishLabels.copied]).toEqual(['Tone', 'Icon', 'Copied']);
  });

  it('counts the matching slash commands in the singular for one and describes each block command', () => {
    expect(englishLabels.resultCount(1)).toBe('1 result');
    expect(englishLabels.resultCount(3)).toBe('3 results');
    expect(Object.keys(englishLabels.slashDescriptions).sort()).toEqual(
      [...Object.keys(englishLabels.blockNames), 'heading1', 'heading2', 'heading3'].sort(),
    );
  });

  it('says how many blocks were deleted and how to bring them back', () => {
    expect(englishLabels.blockDeleted(1)).toBe('Block deleted');
    expect(englishLabels.blockDeleted(3)).toBe('3 blocks deleted');
    expect(englishLabels.undoHint('Ctrl+Z')).toBe('Press Ctrl+Z to undo');
  });

  it('names the groups and the rows of the keyboard shortcuts dialog, and a key pressed after another', () => {
    expect(englishLabels.shortcutGroupNames).toEqual({
      text: 'Text',
      blocks: 'Blocks',
      selection: 'Selection',
      navigation: 'Navigation',
      menus: 'Menus',
    });
    expect(englishLabels.shortcutNames).toEqual({
      lineBreak: 'Line break',
      flipBlock: 'Check a task or open a toggle',
      selectBlock: 'Select the block',
      selectAll: 'Select all',
      extendUp: 'Extend the selection up',
      extendDown: 'Extend the selection down',
      lineUp: 'Previous line',
      lineDown: 'Next line',
      leaveEditor: 'Leave the editor',
      blockMenu: 'Block menu',
      closeMenu: 'Close a menu',
    });
    expect(englishLabels.keySequence('Escape', 'Tab')).toBe('Escape, then Tab');
  });

  it('names the modifier keys of a shortcut hint', () => {
    expect(englishLabels.keyNames).toEqual({ ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift' });
  });

  it('names the gutter controls by what they do, the handle by both its drag and its click', () => {
    expect(englishLabels.addBelow).toBe('Add block below');
    expect(englishLabels.dragHandle).toBe('Drag to move, click for options');
    expect(englishLabels.blockMenu('Heading 2')).toBe('Heading 2 block menu');
  });

  it('writes no empty label and no em or en dash', () => {
    for (const text of KEYS.flatMap(sampleText)) {
      expect(text.trim()).not.toBe('');
      expect(text).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
