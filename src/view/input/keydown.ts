import type { TextSelection } from '../../engine';
import { textSelection } from '../../engine/state/selection';
import { dispatchSelection } from '../controller/dispatch-selection';
import type { ViewController } from '../controller/view-controller';
import { moveHorizontally } from '../navigation/horizontal';
import { moveToNeighbour, neighbourHead } from '../navigation/neighbour-block';
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

const isMod = (controller: ViewController, event: KeyboardEvent): boolean =>
  controller.isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;

// Command with a vertical arrow on a Mac, and Control with Home or End elsewhere, go to the start or the end of the
// document, where the browser would stop at the edge of the host. The start is the first block reached from before the
// document, and the end the last one reached from after it.
function documentEdge(controller: ViewController, event: KeyboardEvent): boolean {
  const at = (controller.isMac ? ['ArrowUp', 'ArrowDown'] : ['Home', 'End']).indexOf(event.key);
  if (at < 0 || !isMod(controller, event) || event.altKey) return false;
  const direction = at ? -1 : 1;
  const { selection } = controller.editor.state;
  const head = event.shiftKey && selection?.kind === 'text' && neighbourHead(controller, null, direction);
  if (!head) return moveToNeighbour(controller, null, direction);
  dispatchSelection(controller, textSelection((selection as TextSelection).anchor, head));
  return true;
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
  if (event.key !== 'Enter' || !isMod(controller, event) || event.shiftKey || event.altKey) return false;
  flipSelectedBlock(controller);
  return true;
}

function handle(controller: ViewController, event: KeyboardEvent): boolean {
  if (arrow(controller, event)) return true;
  if (event.key === 'Tab' && !event.ctrlKey && !event.metaKey && !event.altKey) return tab(controller, event);
  return (
    runKeymap(controller, event) ||
    flip(controller, event) ||
    documentEdge(controller, event) ||
    typeOverNode(controller, event) ||
    holdHistoryKeys(controller, event)
  );
}

/** A read-only editor takes no key but the one that opens or closes a toggle for its reader. */
export function handleReaderKeydown(controller: ViewController, event: KeyboardEvent): void {
  if (flip(controller, event)) event.preventDefault();
}

export function handleKeydown(controller: ViewController, event: KeyboardEvent): void {
  if (isComposingKey(controller, event)) return;
  controller.nativeVerticalMove = false;
  for (const intercept of controller.keyInterceptors) if (intercept(event)) return;
  if (handle(controller, event)) event.preventDefault();
}
