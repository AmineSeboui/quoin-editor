import type { PaletteName } from '../engine/markdown/palette-rgb';

export type SlashGroup = 'basic' | 'lists' | 'media' | 'advanced' | 'embeds' | 'ai' | 'custom';

export type CalloutTone = 'info' | 'tip' | 'success' | 'warning' | 'danger';

/** The block types the menus name. Headings are named by `heading`. */
export type BlockName =
  | 'text'
  | 'bulletedList'
  | 'numberedList'
  | 'todoList'
  | 'quote'
  | 'callout'
  | 'toggle'
  | 'code'
  | 'divider'
  | 'image'
  | 'file';

/** The slash commands that insert a block, which the menu explains under their names. */
export type SlashBlockCommand = BlockName | 'heading1' | 'heading2' | 'heading3';

export type ModifierKey = 'ctrl' | 'alt' | 'shift';

/** The keys a shortcut writes out by name rather than by the character they type. */
export type NamedKey = 'escape' | 'tab' | 'enter' | 'space' | 'backspace' | 'delete' | 'f10';

export type ShortcutGroupName = 'text' | 'blocks' | 'selection' | 'navigation' | 'menus';

/** The rows of the keyboard shortcuts dialog that no other label names. */
export type ShortcutName =
  | 'lineBreak'
  | 'flipBlock'
  | 'selectBlock'
  | 'openBlockEditor'
  | 'leaveBlockEditor'
  | 'selectAll'
  | 'extendUp'
  | 'extendDown'
  | 'lineUp'
  | 'lineDown'
  | 'leaveEditor'
  | 'blockMenu'
  | 'closeMenu'
  | 'splitBlock'
  | 'joinAbove'
  | 'joinBelow'
  | 'previousBlockEnd'
  | 'nextBlockStart';

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
  /** The name of a callout's text, given the name of its tone from `calloutTones`, which it takes as written. */
  callout: (tone: string) => string;
  /** The name of each tone, on its chip and in its menus as inside the name of a callout's text. */
  calloutTones: Record<CalloutTone, string>;
  calloutIcon: string;
  /** The name of the button that shows a callout's tone and opens the menu of tones, given the tone's name. */
  calloutToneMenu: (tone: string) => string;
  toggle: string;
  /** The name of a toggle's chevron, given how many blocks the closed toggle hides, 0 while it is open. */
  toggleButton: (hidden: number) => string;
  placeholderEmpty: string;
  placeholderHeading: (level: number) => string;
  placeholderList: string;
  placeholderQuote: string;
  blockMenu: (type: string) => string;
  blockNames: Record<BlockName, string>;
  turnInto: string;
  color: string;
  textColor: string;
  backgroundColor: string;
  /** The submenus of a callout's block menu that set its tone and its icon. */
  tone: string;
  icon: string;
  duplicate: string;
  copy: string;
  copyLink: string;
  copied: string;
  moveUp: string;
  moveDown: string;
  delete: string;
  askAi: string;
  addBelow: string;
  dragHandle: string;
  slashMenu: string;
  noResults: string;
  /** What the open slash menu says once its list settles, given how many commands match. */
  resultCount: (n: number) => string;
  slashDescriptions: Record<SlashBlockCommand, string>;
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
  blockInserted: (position: number, total: number) => string;
  blockDeleted: (n: number) => string;
  blocksSelected: (n: number) => string;
  /** How to bring deleted blocks back, given the platform's undo shortcut. */
  undoHint: (shortcut: string) => string;
  shortcuts: string;
  shortcutGroupNames: Record<ShortcutGroupName, string>;
  shortcutNames: Record<ShortcutName, string>;
  /** Two keys pressed one after the other. */
  keySequence: (first: string, then: string) => string;
  /** Two shortcuts that do the same thing. */
  keyAlternative: (first: string, other: string) => string;
  /** The modifier keys a shortcut hint names away from a Mac, where it draws their symbols instead. */
  keyNames: Record<ModifierKey, string>;
  namedKeys: Record<NamedKey, string>;
  formattingToolbar: string;
  mobileToolbar: string;
  indent: string;
  outdent: string;
  undo: string;
  redo: string;
  close: string;
  selectedContent: string;
  editBlock: (label: string) => string;
  unsupportedBlock: string;
  /** Optional so a translation written for 1.0 still compiles; English where it is missing. */
  blockError?: string;
  uploading: string;
  uploaded: (name: string) => string;
  /** What an upload field shows when the host's upload fails without a message of its own. */
  uploadFailed: string;
  /** What an upload field shows in place of working when the canvas was given no upload function. */
  uploadsUnavailable: string;
  /** An empty image block: its upload button, the link it can embed instead and what can be dropped or pasted on it. */
  uploadImage: string;
  embedLink: string;
  imageLink: string;
  dropImage: string;
  /** An image block: its caption, its toolbar, the handles of its width with their value, and the toolbar's buttons. */
  imageCaption: string;
  addCaption: string;
  imageTools: string;
  resizeFromLeft: string;
  resizeFromRight: string;
  widthValue: (percent: number) => string;
  replaceImage: string;
  download: string;
  /** The alt text of an image: its field, what the field asks for, its button, and the name of an image without one. */
  altText: string;
  altTextHint: string;
  save: string;
  imageNoAlt: string;
  /**
   * The checkbox of the alt text popover that marks an image as deliberately without a description, the visible text of
   * the badge an editable canvas draws over an image that has neither, and the badge's name, which starts with that
   * visible text and then says what it does. A translation that sets `noAltBadge` should set `addAltText` too; with `noAltBadge` alone the
   * badge is named by its visible text. Optional like `blockError`.
   */
  decorativeImage?: string;
  noAltBadge?: string;
  addAltText?: string;
  /** An empty file block: its upload button and what can be dropped or pasted on it. */
  uploadFile: string;
  dropFile: string;
  /** A file block: its toolbar and the toolbar's replace button. */
  fileTools: string;
  replaceFile: string;
  /** The name of a file's download link, given the file's name. It contains `download`, the link's visible text. */
  downloadFile: (name: string) => string;
  /** The size of a file, given in bytes. */
  fileSize: (bytes: number) => string;
  /** The name of a file block selected as a whole, given the file's name. */
  fileBlockName: (name: string) => string;
  /** A code block: its code, its language, the name of a code in no language, and its copy button. */
  codeText: string;
  /** The name of a code block selected as a whole, given the name of its language. */
  codeBlockName: (language: string) => string;
  codeLanguage: string;
  plainText: string;
  copyCode: string;
  /** What the preview of a block without content says. */
  emptyImage: string;
  emptyFile: string;
  emptyMarkdown: string;
  emptyCallout: string;
};
