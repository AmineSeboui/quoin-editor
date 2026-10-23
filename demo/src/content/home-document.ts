import type { QuoinBlock } from 'quoin-editor';

const text = (id: string, markdown: string, indent?: number): QuoinBlock => ({
  id,
  type: 'MARKDOWN',
  data: { markdown },
  ...(indent ? { indent } : {}),
});

/** The sample document of the home page: every text block is markdown, every other block typed data beside it. */
export const homeDocument: QuoinBlock[] = [
  text('title', '## Release notes'),
  text('lede', 'Type here. **Bold**, _italic_, `code` and [links](https://github.com/AmineSeboui/quoin-editor) format as you type them.'),
  text('slash', 'Press / on an empty line for the block menu, or Mod+Shift+/ for every shortcut.'),
  text('list', '- Drag the handle beside a block to move it'),
  text('list-2', '- Select text for the formatting toolbar'),
  text('task', '- [x] Store the document as plain JSON'),
  text('task-2', '- [ ] Diff it in git'),
  text('quote', '> Blocks you never edit are never rewritten.'),
  { id: 'callout', type: 'CALLOUT', data: { tone: 'tip', body: 'The panel beside the editor is what onChange hands you, as markdown.' } },
  { id: 'toggle', type: 'TOGGLE', data: { markdown: 'What is a quoin?', open: false } },
  text('toggle-body', 'The wedge a printer tightens to lock blocks of type into the frame.', 1),
  { id: 'code', type: 'CODE', data: { language: 'tsx', code: '<BlockCanvas blocks={blocks} onChange={setBlocks} />' } },
  { id: 'divider', type: 'DIVIDER', data: {} },
  text('end', 'Every edit above is saved as a QuoinBlock[] in this page’s state.'),
];
