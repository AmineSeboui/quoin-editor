import type { PaletteName } from '../engine/markdown/palette-rgb';

export type SlashGroup = 'basic' | 'lists' | 'media' | 'advanced' | 'embeds' | 'ai' | 'custom';

/** Every string the editor shows or speaks. A label that depends on a value is a function of it. */
export type QuoinLabels = {
  document: string;
  editorHint: string;
  paragraph: string;
  heading: (level: number) => string;
  bulletItem: string;
  numberedItem: (n: number) => string;
  task: string;
  quote: string;
  callout: (tone: string) => string;
  toggle: string;
  placeholderEmpty: string;
  placeholderHeading: (level: number) => string;
  placeholderList: string;
  placeholderQuote: string;
  blockMenu: (type: string) => string;
  turnInto: string;
  color: string;
  textColor: string;
  backgroundColor: string;
  duplicate: string;
  copy: string;
  copyLink: string;
  moveUp: string;
  moveDown: string;
  delete: string;
  askAi: string;
  addBelow: string;
  dragHandle: string;
  slashMenu: string;
  noResults: string;
  groups: Record<SlashGroup, string>;
  bold: string;
  italic: string;
  underline: string;
  strike: string;
  code: string;
  link: string;
  highlight: string;
  align: string;
  alignLeft: string;
  alignCenter: string;
  alignRight: string;
  alignJustify: string;
  subscript: string;
  superscript: string;
  comment: string;
  linkUrl: string;
  linkApply: string;
  linkRemove: string;
  linkOpen: string;
  linkEdit: string;
  invalidLink: string;
  colors: Record<PaletteName, string>;
  blockMoved: (position: number, total: number) => string;
  blockDeleted: string;
  blocksSelected: (n: number) => string;
  undoHint: string;
  shortcuts: string;
  formattingToolbar: string;
  mobileToolbar: string;
  indent: string;
  outdent: string;
  undo: string;
  redo: string;
};

export const englishLabels: QuoinLabels = {
  document: 'Editor',
  editorHint: 'Press Escape, then Tab, to leave the editor.',
  paragraph: 'Paragraph',
  heading: (level) => `Heading ${level}`,
  bulletItem: 'Bullet list item',
  numberedItem: (n) => `Numbered list item ${n}`,
  task: 'Task',
  quote: 'Quote',
  callout: (tone) => `Callout, ${tone}`,
  toggle: 'Toggle',
  placeholderEmpty: "Type '/' for commands",
  placeholderHeading: (level) => `Heading ${level}`,
  placeholderList: 'List',
  placeholderQuote: 'Quote',
  blockMenu: (type) => `${type} block menu`,
  turnInto: 'Turn into',
  color: 'Color',
  textColor: 'Text color',
  backgroundColor: 'Background color',
  duplicate: 'Duplicate',
  copy: 'Copy',
  copyLink: 'Copy link to block',
  moveUp: 'Move up',
  moveDown: 'Move down',
  delete: 'Delete',
  askAi: 'Ask AI',
  addBelow: 'Add block below',
  dragHandle: 'Drag to move',
  slashMenu: 'Commands',
  noResults: 'No results',
  groups: {
    basic: 'Basic',
    lists: 'Lists',
    media: 'Media',
    advanced: 'Advanced',
    embeds: 'Embeds',
    ai: 'AI',
    custom: 'Custom',
  },
  bold: 'Bold',
  italic: 'Italic',
  underline: 'Underline',
  strike: 'Strikethrough',
  code: 'Code',
  link: 'Link',
  highlight: 'Highlight',
  align: 'Align',
  alignLeft: 'Align left',
  alignCenter: 'Align center',
  alignRight: 'Align right',
  alignJustify: 'Justify',
  subscript: 'Subscript',
  superscript: 'Superscript',
  comment: 'Comment',
  linkUrl: 'Link address',
  linkApply: 'Apply link',
  linkRemove: 'Remove link',
  linkOpen: 'Open link',
  linkEdit: 'Edit link',
  invalidLink: 'Enter a valid link, such as https://example.com',
  colors: {
    default: 'Default',
    gray: 'Gray',
    brown: 'Brown',
    orange: 'Orange',
    yellow: 'Yellow',
    green: 'Green',
    blue: 'Blue',
    purple: 'Purple',
    pink: 'Pink',
    red: 'Red',
  },
  blockMoved: (position, total) => `Block moved to position ${position} of ${total}`,
  blockDeleted: 'Block deleted',
  blocksSelected: (n) => `${n} ${n === 1 ? 'block' : 'blocks'} selected`,
  undoHint: 'Undo to bring it back',
  shortcuts: 'Keyboard shortcuts',
  formattingToolbar: 'Text formatting',
  mobileToolbar: 'Editing tools',
  indent: 'Indent',
  outdent: 'Outdent',
  undo: 'Undo',
  redo: 'Redo',
};

/** The English labels with the host's overrides on top. A key the host leaves out, or passes as undefined, stays
 *  English. */
export function resolveLabels(overrides?: Partial<QuoinLabels>): QuoinLabels {
  if (overrides === undefined) return englishLabels;
  const given = Object.entries(overrides).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishLabels : { ...englishLabels, ...Object.fromEntries(given) };
}
