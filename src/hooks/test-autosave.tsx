import * as React from 'react';
import { screen, act } from '@testing-library/react';
import { useAutosave, type UseAutosaveInput } from './useAutosave';

type Payload = { n: number };
type HarnessProps = {
  save: (payload: Payload) => unknown;
  options?: Partial<UseAutosaveInput<Payload>>;
};

export function Harness({ save, options }: HarnessProps) {
  const [n, setN] = React.useState(0);
  const { status, error, retry, flush } = useAutosave({
    deps: [n],
    build: () => ({ n }),
    save,
    ...options,
  });
  return (
    <>
      <span data-testid="status">{status}</span>
      <span data-testid="error">{error instanceof Error ? error.message : ''}</span>
      <button type="button" onClick={() => setN((v) => v + 1)}>
        edit
      </button>
      <button type="button" onClick={retry}>
        retry
      </button>
      <button type="button" onClick={flush}>
        flush
      </button>
    </>
  );
}

export const status = () => screen.getByTestId('status').textContent;
export const errorText = () => screen.getByTestId('error').textContent;

export async function press(name: string) {
  await act(async () => {
    screen.getByRole('button', { name }).click();
  });
}

export const edit = () => press('edit');

export function slowFirstSave() {
  let resolve: () => void = () => {};
  const save = vi.fn().mockImplementationOnce(() => new Promise<void>((r) => (resolve = r)));
  return { save, release: () => act(async () => resolve()) };
}

export async function settle(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}
