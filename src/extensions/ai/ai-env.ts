import type { ViewController } from '../../view';
import type { AiAction, AiStream } from './ai-actions';
import { ask } from './ai-flow';
import type { AiActionDefinition } from './ai-host-actions';
import type { AiLabels } from './ai-labels';
import type { RequestInput } from './ai-request';

/** What every part of the AI UI reads: the canvas, the host's stream, the labels and the host's actions in the menu. */
export type AiEnv = {
  readonly controller: ViewController;
  readonly stream: AiStream;
  readonly labels: AiLabels;
  readonly actions: readonly AiActionDefinition[];
};

/** What asking needs: the canvas and the host's stream. */
export type AiAsker = Pick<AiEnv, 'controller' | 'stream'>;

/** The language of the canvas, from the closest `lang` around it. */
export function languageOf(controller: ViewController): string | undefined {
  return controller.root?.closest('[lang]')?.getAttribute('lang') || undefined;
}

function askInLanguage({ controller, stream }: AiAsker, input: RequestInput): void {
  const language = languageOf(controller);
  ask(controller.editor, stream, language ? { ...input, language } : input);
}

/** Asks the host about the target of the open menu, in the canvas's language. */
export function askFrom(asker: AiAsker, action: AiAction, prompt?: string): void {
  askInLanguage(asker, prompt === undefined ? { action } : { action, prompt });
}

/** Asks the host one of its own actions about the target of the open menu, in the canvas's language. */
export function askHost(asker: AiAsker, { id, prompt }: AiActionDefinition): void {
  askInLanguage(asker, { action: 'custom', actionId: id, prompt });
}
