import type { AiAction, AiRequest } from 'quoin-editor/ai';
import type { Prompt } from './model-stream.ts';

const SYSTEM = [
  'You are the writing assistant inside Quoin, a block editor whose documents are markdown.',
  'Answer with only the markdown that goes into the document: no preamble, no notes, and no code fence around the whole answer.',
  'Keep the voice, terms and formatting of the document around it.',
].join(' ');

const INSTRUCTIONS: Record<AiAction, (prompt: string) => string> = {
  continue: () => 'Continue writing from the end of the selection, in the same style. Answer with only the new text.',
  improve: () => 'Rewrite the selection so it reads better, keeping its meaning.',
  fix: () => 'Fix the spelling, grammar and punctuation of the selection, and change nothing else.',
  shorten: () => 'Rewrite the selection shorter, keeping what matters.',
  lengthen: () => 'Rewrite the selection longer, with detail that fits the document.',
  simplify: () => 'Rewrite the selection in simpler words and shorter sentences.',
  tone: (tone) => `Rewrite the selection in a ${tone || 'different'} tone.`,
  translate: (language) => `Translate the selection into ${language || 'English'}.`,
  summarize: () => 'Summarize the selection in a few sentences, or the whole document when the selection is empty.',
  explain: () => 'Explain the selection plainly, for a reader of this document.',
  custom: (prompt) => `${prompt}\n\nWhen this asks for a change to the selection, answer with the whole text that replaces it.`,
};

const isText = (value: unknown): value is string => typeof value === 'string';

const isOptionalText = (value: unknown) => value === undefined || isText(value);

/** Whether a request body is the editor's `AiRequest`. */
export function isAiRequest(value: unknown): value is AiRequest {
  if (typeof value !== 'object' || value === null) return false;
  const { action, prompt, selection, context, language } = value as Record<string, unknown>;
  return (
    isText(action) &&
    Object.hasOwn(INSTRUCTIONS, action) &&
    isText(selection) &&
    isText(context) &&
    isOptionalText(prompt) &&
    isOptionalText(language)
  );
}

/** The system prompt and the user turn that ask a model for the editor's request. */
export function promptFor({ action, prompt = '', selection, context, language }: AiRequest): Prompt {
  const system = language ? `${SYSTEM} The document's language is ${language}.` : SYSTEM;
  const user = [
    `<document>\n${context}\n</document>`,
    `<selection>\n${selection}\n</selection>`,
    INSTRUCTIONS[action](prompt.trim()),
  ].join('\n\n');
  return { system, user };
}
