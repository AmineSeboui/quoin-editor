import type { ViewController } from '../controller/view-controller';
import { moveHorizontally } from '../navigation/horizontal';
import { moveVertically } from '../navigation/vertical';
import { flipSelectedBlock } from './flip-block';

export type KeyInterceptor = (event: KeyboardEvent) => boolean;

type Move = (controller: ViewController, direction: -1 | 1, extend: boolean) => boolean;

const ARROWS: Readonly<Record<string, readonly [Move, -1 | 1]>> = {
  ArrowUp: [moveVertically, -1],
  ArrowDown: [moveVertically, 1],
  ArrowLeft: [moveHorizontally, -1],
  ArrowRight: [moveHorizontally, 1],
};

export function isComposingKey(controller: ViewController, event: KeyboardEvent): boolean {
  return event.isComposing || event.keyCode === 229 || controller.composingKey !== null;
}

const runKeymap = (controller: ViewController, event: KeyboardEvent): boolean =>
  controller.edit(() => controller.editor.handleKey(event));

// Alt arrows cross blocks at an edge. Ctrl and Meta arrows are line and word moves the browser makes, so they go to the
// keymap and then to the browser.
function arrow(controller: ViewController, event: KeyboardEvent): boolean {
  if (!Object.hasOwn(ARROWS, event.key) || event.ctrlKey || event.metaKey) return false;
  const [move, direction] = ARROWS[event.key];
  return move(controller, direction, event.shiftKey);
}

// Tab in text never leaves the editor, even where nothing indents: Escape then Tab is the documented way out.
function tab(controller: ViewController, event: KeyboardEvent): boolean {
  const { selection } = controller.editor.state;
  if (selection === null || selection.kind === 'blocks') return false;
  runKeymap(controller, event);
  return true;
}

// A node-selected block holds focus without being editable, so its printable keys arrive only as keydown.
function typeOverNode(controller: ViewController, event: KeyboardEvent): boolean {
  const { key } = event;
  const node = controller.editor.state.selection?.kind === 'node';
  if (!node || event.ctrlKey || event.metaKey || [...key].length !== 1) return false;
  return controller.edit(() => controller.editor.insertText(key));
}

// A node or block selection leaves focus on an element that is not editable, where WebKit and Chrome take Cmd or Alt with
// a horizontal arrow for Back and Forward, so nothing the keymap did not claim reaches the browser.
function holdHistoryKeys(controller: ViewController, event: KeyboardEvent): boolean {
  const kind = controller.editor.state.selection?.kind;
  if (kind !== 'node' && kind !== 'blocks') return false;
  return Object.hasOwn(ARROWS, event.key) && (event.metaKey || event.ctrlKey || event.altKey);
}

// Mod+Enter checks the task or opens the toggle that holds the caret, the two controls a keyboard never tabs to. Where
// nothing flips it is still taken, so that no browser can read it as a plain Enter.
function flip(controller: ViewController, event: KeyboardEvent): boolean {
  const mod = controller.isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (event.key !== 'Enter' || !mod || event.shiftKey || event.altKey) return false;
  flipSelectedBlock(controller);
  return true;
}

function handle(controller: ViewController, event: KeyboardEvent): boolean {
  if (arrow(controller, event)) return true;
  if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) return tab(controller, event);
  return (
    runKeymap(controller, event) ||
    flip(controller, event) ||
    typeOverNode(controller, event) ||
    holdHistoryKeys(controller, event)
  );
}

export function handleKeydown(controller: ViewController, event: KeyboardEvent): void {
  if (isComposingKey(controller, event)) return;
  controller.nativeVerticalMove = false;
  for (const intercept of controller.keyInterceptors) if (intercept(event)) return;
  if (handle(controller, event)) event.preventDefault();
}
