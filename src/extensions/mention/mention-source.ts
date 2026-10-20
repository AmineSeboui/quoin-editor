import { toError } from '../../to-error';
import type { MentionResult } from './mention-feature';

export const SEARCH_DELAY_MS = 120;

type SourceOptions = {
  /** The host's search, read when the wait ends. */
  search(query: string): Promise<readonly MentionResult[]>;
  /** Whether the menu still asks for the query when the wait ends. */
  isAsked(query: string): boolean;
  onError(error: Error): void;
};

export type MentionSource = {
  readonly source: (query: string) => Promise<readonly MentionResult[]>;
  cancel(): void;
};

function isResult(value: unknown): value is MentionResult {
  const { id, label } = (value ?? {}) as Partial<Record<keyof MentionResult, unknown>>;
  return typeof id === 'string' && typeof label === 'string';
}

const resultsOf = (answer: unknown): readonly MentionResult[] => (Array.isArray(answer) ? answer.filter(isResult) : []);

/**
 * The menu's source of results. It asks the host's search once the query has rested for 120 ms, if the menu still asks
 * for it then, and answers no results, reporting the error, when the search throws or rejects. A query asked meanwhile
 * replaces the one waiting, whose answer never comes.
 */
export function createMentionSource({ search, isAsked, onError }: SourceOptions): MentionSource {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const cancel = () => clearTimeout(timer);
  const source = (query: string) =>
    new Promise<readonly MentionResult[]>((resolve) => {
      cancel();
      timer = setTimeout(() => {
        if (!isAsked(query)) return;
        new Promise<unknown>((answer) => answer(search(query))).then(
          (answer) => resolve(resultsOf(answer)),
          (reason: unknown) => {
            onError(toError(reason));
            resolve([]);
          },
        );
      }, SEARCH_DELAY_MS);
    });
  return { source, cancel };
}
