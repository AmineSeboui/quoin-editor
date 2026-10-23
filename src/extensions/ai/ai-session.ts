import { toError } from '../../to-error';
import type { AiRequest, AiStream } from './ai-actions';
import type { AiEditor, AiLink, AiRun } from './ai-link';
import { aiState, aiTransaction, type AiAct, type AiPhase } from './ai-plugin';

let nextKey = 0;

function onNextFrame(draw: () => void): () => void {
  if (typeof requestAnimationFrame === 'function') {
    const frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }
  const timer = setTimeout(draw, 16);
  return () => clearTimeout(timer);
}

/** Stops reading the stream being read, if any, without drawing anything more of it; aborts it unless it ended. */
export function endRun(link: AiLink, ended = false): AiRun | null {
  const { run } = link;
  if (run === null) return null;
  link.run = null;
  run.cancelFrame?.();
  run.cancelFrame = null;
  if (!ended) run.abort.abort();
  return run;
}

const send = (editor: AiEditor, act: AiAct) => editor.dispatch(aiTransaction(editor.state, act));

async function read(editor: AiEditor, link: AiLink, run: AiRun, stream: AiStream, request: AiRequest): Promise<void> {
  const live = () => link.run === run && link.mounts > 0;
  const end = (phase: AiPhase) => {
    endRun(link, true);
    send(editor, { type: 'end', key: run.key, phase, output: run.output });
  };
  const draw = () => {
    run.cancelFrame = null;
    if (live()) send(editor, { type: 'stream', key: run.key, output: run.output });
  };
  try {
    // Awaited, so a host that answers with a rejected promise is heard with its own reason.
    const chunks = await stream(request, run.abort.signal);
    for await (const chunk of chunks) {
      if (!live()) return;
      if (typeof chunk !== 'string') throw new TypeError(`The AI stream gave a chunk that is not text: ${typeof chunk}`);
      run.output += chunk;
      run.cancelFrame ??= onNextFrame(draw);
    }
    if (!live()) return;
    end('done');
    link.ended('done', run.output);
  } catch (error) {
    if (!live()) return;
    end('error');
    link.report(toError(error));
  }
}

/** Shows a new answer for the target, written as the host streams it; any stream still being read is aborted. */
export function startStream(editor: AiEditor, link: AiLink, stream: AiStream, request: AiRequest, replace: boolean) {
  endRun(link);
  if (aiState(editor.state).target === null || link.mounts === 0) return;
  const run: AiRun = { key: ++nextKey, abort: new AbortController(), output: '', cancelFrame: null };
  link.run = run;
  link.last = request;
  send(editor, { type: 'start', key: run.key, replace });
  void read(editor, link, run, stream, request);
}

function stopped(editor: AiEditor, link: AiLink, key: number, output: string): void {
  const { ghost } = aiState(editor.state);
  if (link.mounts === 0 || ghost?.key !== key || ghost.phase !== 'streaming') return;
  send(editor, { type: 'end', key, phase: 'stopped', output });
  link.ended('stopped', output);
}

/**
 * Aborts the stream and keeps what it wrote, chunks not drawn yet among it. An answer still shown as streaming that no
 * stream feeds any more, as after the canvas was unmounted and mounted again, is stopped as it stands.
 */
export function stopStream(editor: AiEditor, link: AiLink): void {
  const run = endRun(link);
  const { ghost } = aiState(editor.state);
  if (run !== null) stopped(editor, link, run.key, run.output);
  else if (ghost !== null) stopped(editor, link, ghost.key, ghost.output);
}

/**
 * Aborts the stream once its answer is no longer streaming: discarded, accepted or replaced. When the target's block is
 * deleted the stream is aborted at once and the answer stopped with all it wrote, once the change has been committed.
 */
export function watchGhost(editor: AiEditor, link: AiLink): () => void {
  return editor.subscribe((state, tr) => {
    const { run } = link;
    const { ghost, target } = aiState(state);
    if (run === null) return;
    if (ghost?.key !== run.key || ghost.phase !== 'streaming') endRun(link);
    else if (target?.lost !== undefined && tr !== null && aiState(tr.before).target?.lost === undefined) {
      endRun(link);
      queueMicrotask(() => stopped(editor, link, run.key, run.output));
    }
  });
}
