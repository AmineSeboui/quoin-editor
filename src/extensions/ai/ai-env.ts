import type { ViewController } from '../../view';
import type { AiAction, AiStream } from './ai-actions';
import { ask } from './ai-flow';
import type { AiLabels } from './ai-labels';

/** What every part of the AI UI reads: the canvas, the host's stream and the labels. */
export type AiEnv = { readonly controller: ViewController; readonly stream: AiStream; readonly labels: AiLabels };

/** The language of the canvas, from the closest `lang` around it. */
export function languageOf(controller: ViewController): string | undefined {
  return controller.root?.closest('[lang]')?.getAttribute('lang') || undefined;
}

/** Asks the host about the target of the open menu, in the canvas's language. */
export function askFrom(env: AiEnv, action: AiAction, prompt?: string): void {
  const { controller, stream } = env;
  const language = languageOf(controller);
  ask(controller.editor, stream, { action, ...(prompt === undefined ? {} : { prompt }), ...(language ? { language } : {}) });
}
