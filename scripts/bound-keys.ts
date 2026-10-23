import { createVoidEditing } from '../src/blocks/void/void-editing';
import { createCanvasUiStore } from '../src/canvas/ui-store';
import { aiExtension } from '../src/ai';
import { catalogue } from '../src/catalogue';
import { commentsExtension, createCommentThreads } from '../src/comments';
import { coreExtensions, type Extension } from '../src/engine';
import { blockMenuKeymap } from '../src/gutter/block-menu-keymap';
import { bubbleExtension } from '../src/menus/bubble/bubble-extension';
import { linkExtension } from '../src/menus/link/link-extension';
import { slashExtension } from '../src/menus/slash/slash-extension';
import { shortcutsExtension } from '../src/shortcuts/shortcuts-extension';

const chordsOf = (extensions: readonly Extension[]) =>
  extensions.flatMap((extension) => Object.keys((extension as { keymap?: object }).keymap ?? {}));

/** The extensions `BlockCanvas` mounts before the host's, as its source lists them. */
export const CANVAS_EXTENSIONS = [
  '...coreExtensions()',
  'voidEditing.extension',
  'blockMenuKeymap(uiStore)',
  'slashExtension()',
  'bubbleExtension()',
  'linkExtension(uiStore)',
  'shortcutsExtension(uiStore)',
];

/** The chords the keymaps of `BlockCanvas`'s own extensions bind, built as `CANVAS_EXTENSIONS` lists them. */
export function canvasChords(): string[] {
  const store = createCanvasUiStore();
  return chordsOf([
    ...coreExtensions(),
    createVoidEditing().extension,
    blockMenuKeymap(store),
    slashExtension(),
    bubbleExtension(),
    linkExtension(store),
    shortcutsExtension(store),
  ]);
}

const nothing = async () => {};

/** The chords the keymaps of the opt-in features bind, each built with options that only fill its required fields. */
export function featureChords(): string[] {
  return chordsOf([
    ...catalogue({ mention: { search: async () => [] } }),
    commentsExtension({
      threads: createCommentThreads(),
      currentUser: { id: 'reader', name: 'Reader' },
      onCreate: async () => 'thread',
      onReply: nothing,
      onResolve: nothing,
      onDelete: nothing,
    }),
    aiExtension({ stream: async function* () {} }),
  ]);
}
