import { act, cleanup, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { paragraph } from '../../blocks/void/test-canvas';
import type { AiOptions } from './ai-extension';
import { mountAi } from './ai-test-canvas';

async function failing(error: unknown, options: Partial<AiOptions> = {}) {
  const canvas = mountAi([paragraph('a', 'Say a word here')], options);
  canvas.select('a', 4, 10);
  canvas.askAi();
  canvas.typeInField('improve');
  canvas.press('Enter');
  canvas.last().fail(error);
  await canvas.frame();
  return canvas;
}

const keyMissing = new Error('No GEMINI_API_KEY: add it to .env.local');

describe('a failed answer', () => {
  it('keeps the reason hidden when the host describes none', async () => {
    const canvas = await failing(keyMissing);
    expect(screen.getByRole('alert')).toHaveTextContent('AI could not answer');
    expect(canvas.bar()).not.toHaveTextContent('GEMINI');
    expect(canvas.button('Retry')).toBeInTheDocument();
  });

  it('shows the reason the host describes under the label, in the alert, and still reports the error', async () => {
    const describeError = vi.fn((error: unknown) => (error instanceof Error ? error.message : undefined));
    const canvas = await failing(keyMissing, { describeError });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('AI could not answer');
    expect(alert).toHaveTextContent('No GEMINI_API_KEY: add it to .env.local');
    expect(alert.textContent!.indexOf('AI could')).toBeLessThan(alert.textContent!.indexOf('No GEMINI'));
    expect(describeError).toHaveBeenCalledWith(keyMissing);
    expect(canvas.onError).toHaveBeenCalledWith(keyMissing);
    expect(await act(() => axe(canvas.bar()!))).toHaveNoViolations();
  });

  it('shows the label alone when the host describes an error as nothing', async () => {
    for (const reason of [undefined, '', '  ', 42]) {
      await failing(keyMissing, { describeError: () => reason as string });
      expect(screen.getByRole('alert').textContent).toBe('AI could not answer');
      cleanup();
    }
  });

  it('offers Discard alone, with focus on it, for an error the host says is not worth retrying', async () => {
    const isRetryable = vi.fn(() => false);
    const canvas = await failing(keyMissing, { isRetryable });
    expect(isRetryable).toHaveBeenCalledWith(keyMissing);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(document.activeElement).toBe(canvas.button('Discard'));
    canvas.click('Discard');
    expect(canvas.bar()).toBeNull();
    expect(canvas.markdown('a')).toBe('Say a word here');
  });

  it('falls back to the label and to Retry when the host callbacks throw', async () => {
    const canvas = await failing(keyMissing, {
      describeError: () => {
        throw new Error('describe broke');
      },
      isRetryable: () => {
        throw new Error('retry broke');
      },
    });
    expect(screen.getByRole('alert').textContent).toBe('AI could not answer');
    expect(document.activeElement).toBe(canvas.button('Retry'));
    expect(canvas.onError).toHaveBeenCalledTimes(1);
    expect(canvas.onError).toHaveBeenCalledWith(keyMissing);
  });

  it('asks the host again on Retry and forgets the last reason while the new answer streams', async () => {
    const canvas = await failing(keyMissing, { describeError: () => 'Quota used up' });
    canvas.click('Retry');
    expect(canvas.bar()).not.toHaveTextContent('Quota used up');
    canvas.last().push('one');
    canvas.last().end();
    await canvas.frame();
    expect(canvas.bar()).not.toHaveTextContent('Quota used up');
    expect(canvas.button('Accept')).toBeInTheDocument();
  });
});
