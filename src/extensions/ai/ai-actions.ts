export type AiAction =
  | 'continue'
  | 'improve'
  | 'fix'
  | 'shorten'
  | 'lengthen'
  | 'simplify'
  | 'tone'
  | 'translate'
  | 'summarize'
  | 'explain'
  | 'custom';

/** What the host is asked: `selection` and `context` are markdown, `language` the canvas's `lang` when it has one. */
export type AiRequest = {
  action: AiAction;
  prompt?: string;
  selection: string;
  context: string;
  language?: string;
};

/** The host's model, answering a request as markdown in chunks, and stopping when `signal` aborts. */
export type AiStream = (request: AiRequest, signal: AbortSignal) => AsyncIterable<string>;

/** The actions that write something new, which the AI menu lists first. */
export const WRITE_ACTIONS: readonly AiAction[] = ['continue', 'summarize', 'explain'];

/** The actions that rewrite the text they are asked about. */
export const EDIT_ACTIONS: readonly AiAction[] = ['improve', 'fix', 'shorten', 'lengthen', 'simplify', 'tone', 'translate'];

/** The actions the AI menu lists, in its order; `custom` is what is typed in its field. */
export const MENU_ACTIONS: readonly AiAction[] = [...WRITE_ACTIONS, ...EDIT_ACTIONS];

/** Actions on an empty line, which has no text to change. */
export const EMPTY_LINE_ACTIONS: readonly AiAction[] = ['continue', 'summarize'];

const TRANSFORMS: ReadonlySet<AiAction> = new Set(EDIT_ACTIONS);

/** Actions that need words from the writer first: the tone to take or the language to translate to. */
export const ASKS_FOR_PROMPT: ReadonlySet<AiAction> = new Set(['tone', 'translate']);

/**
 * Whether the answer replaces the text it was asked about, rather than going below it: the actions that rewrite it do,
 * and so does a typed request about selected text.
 */
export const replacesTarget = (action: AiAction, selected: boolean): boolean =>
  TRANSFORMS.has(action) || (action === 'custom' && selected);
