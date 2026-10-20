import { render, act } from '@testing-library/react';
import { Harness, status, press, edit, slowFirstSave, settle } from './test-autosave';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useAutosave', () => {
  it('runs one save at a time and follows up once with the newest payload', async () => {
    const { save, release } = slowFirstSave();
    render(<Harness save={save} />);
    await edit();
    await settle(2000);
    expect(save).toHaveBeenCalledTimes(1);
    await edit();
    await edit();
    await settle(10_000);
    expect(save).toHaveBeenCalledTimes(1);
    await release();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ n: 3 });
    expect(status()).toBe('saved');
    await settle(60_000);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('starts no second save from retry, flush or pagehide while one is running', async () => {
    const { save, release } = slowFirstSave();
    render(<Harness save={save} />);
    await edit();
    await settle(2000);
    await edit();
    await press('retry');
    await press('flush');
    await act(async () => window.dispatchEvent(new Event('pagehide')));
    expect(save).toHaveBeenCalledTimes(1);
    await release();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save).toHaveBeenLastCalledWith({ n: 2 });
    await settle(60_000);
    expect(save).toHaveBeenCalledTimes(2);
  });
});
