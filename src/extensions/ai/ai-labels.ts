import type { AiAction } from './ai-actions';

/** Every string AI actions show or speak. */
export type AiLabels = {
  /** The toolbar button, block menu item and slash command that open the AI menu. */
  askAi: string;
  /** What the slash command for the AI menu does. */
  askAiDescription: string;
  /** The name of each action in the AI menu; `custom` names the slash command group's own entry. */
  actions: Record<AiAction, string>;
  /** The name of the list of actions. */
  menu: string;
  /** The field the writer types a request in. */
  prompt: string;
  /** The field once Change tone is chosen. */
  tonePrompt: string;
  /** The field once Translate is chosen. */
  translatePrompt: string;
  /** The choice that sends what was typed as a request of its own. */
  ask(prompt: string): string;
  /** The name of the bar under the answer. */
  response: string;
  writing: string;
  stopped: string;
  stop: string;
  accept: string;
  discard: string;
  retry: string;
  /** The field for a further request about the answer. */
  followUp: string;
  /** Shown when the host's answer failed. */
  failed: string;
  /** Said once an answer is complete, given its text. */
  written(text: string): string;
  /** Said once an answer is stopped, given what it wrote. */
  halted(text: string): string;
  /** Shown when the text the answer was for was deleted meanwhile. */
  targetGone: string;
};

export const englishAiLabels: AiLabels = {
  askAi: 'Ask AI',
  askAiDescription: 'Write or edit with AI',
  actions: {
    continue: 'Continue writing',
    improve: 'Improve writing',
    fix: 'Fix spelling and grammar',
    shorten: 'Make shorter',
    lengthen: 'Make longer',
    simplify: 'Simplify language',
    tone: 'Change tone',
    translate: 'Translate',
    summarize: 'Summarize',
    explain: 'Explain',
    custom: 'Ask AI',
  },
  menu: 'AI actions',
  prompt: 'Ask AI to write or edit',
  tonePrompt: 'Tone to take, such as friendly',
  translatePrompt: 'Language to translate to',
  ask: (prompt) => `Ask AI: ${prompt}`,
  response: 'AI response',
  writing: 'Writing',
  stopped: 'Stopped',
  stop: 'Stop',
  accept: 'Accept',
  discard: 'Discard',
  retry: 'Retry',
  followUp: 'Tell AI what to do next',
  failed: 'AI could not answer',
  written: (text) => `AI response ready: ${text}`,
  halted: (text) => `Stopped. AI response so far: ${text}`,
  targetGone: 'The text this was for was removed, so Accept inserts it where that text was',
};

/** The English labels with the host's overrides on top. A key left out, or passed as undefined, stays English. */
export function resolveAiLabels(overrides?: Partial<AiLabels>): AiLabels {
  const given = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return given.length === 0 ? englishAiLabels : { ...englishAiLabels, ...Object.fromEntries(given) };
}
