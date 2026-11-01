/** What the route asks a model: a system prompt and one user turn. */
export type Prompt = { system: string; user: string };

/** A provider's model answering a prompt in text chunks, and stopping when `signal` aborts. */
export type ModelStream = (prompt: Prompt, signal: AbortSignal) => AsyncIterable<string>;

/** The `ANTHROPIC_`, `GEMINI_` and `QUOIN_AI_` variables of the dev server's environment and env files. */
export type AiEnv = Record<string, string>;
