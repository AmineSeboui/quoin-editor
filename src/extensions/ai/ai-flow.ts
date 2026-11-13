import { toError } from '../../to-error';
import type { AiRequest, AiStream } from './ai-actions';
import { replacesTarget } from './ai-actions';
import type { AiEditor } from './ai-link';
import { linkOf } from './ai-link';
import { aiState, aiTransaction } from './ai-plugin';
import { buildRequest, type RequestInput } from './ai-request';
import { startStream, stopStream } from './ai-session';
import type { AiTarget } from './ai-target';

/** Opens the AI menu about the target; an answer still shown is discarded. */
export function openMenu(editor: AiEditor, target: AiTarget, fromSpace: boolean): void {
  editor.dispatch(aiTransaction(editor.state, { type: 'open', target, fromSpace }));
}

export function closeMenu(editor: AiEditor): void {
  editor.dispatch(aiTransaction(editor.state, { type: 'close' }));
}

/** Asks the host about the target of the open menu. A host's prompt function that throws asks nothing. */
export function ask(editor: AiEditor, stream: AiStream, input: RequestInput): void {
  const { target } = aiState(editor.state);
  if (target === null) return;
  const link = linkOf(editor);
  let request: AiRequest;
  try {
    request = buildRequest(editor.state, target, input);
  } catch (error) {
    link.report(toError(error));
    return;
  }
  startStream(editor, link, stream, request, replacesTarget(input.action, target.selected));
}

/** Asks again what was last asked, for the same target. */
export function retry(editor: AiEditor, stream: AiStream): void {
  const link = linkOf(editor);
  const { ghost } = aiState(editor.state);
  if (ghost !== null && link.last !== null) startStream(editor, link, stream, link.last, ghost.replace);
}

/** Asks for a change to the last answer, which the new answer then replaces. */
export function followUp(editor: AiEditor, stream: AiStream, prompt: string): void {
  const link = linkOf(editor);
  const { ghost } = aiState(editor.state);
  if (ghost === null || link.last === null) return;
  const { context, language } = link.last;
  const request = { action: 'custom' as const, prompt, selection: ghost.output, context };
  startStream(editor, link, stream, language === undefined ? request : { ...request, language }, ghost.replace);
}

export function stop(editor: AiEditor): void {
  stopStream(editor, linkOf(editor));
}

/** Focus arrived in the canvas: every line counts as having held no text again. */
export function noteFocus(editor: AiEditor): void {
  if (aiState(editor.state).held.length > 0) editor.dispatch(aiTransaction(editor.state, { type: 'focus' }));
}

export function discard(editor: AiEditor): void {
  editor.dispatch(aiTransaction(editor.state, { type: 'discard' }));
}
