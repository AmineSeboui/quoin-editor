import { isMac } from './platform';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function platform(value: string) {
  vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue(value);
}

describe('isMac', () => {
  it.each(['MacIntel', 'iPhone', 'iPad'])('is true for %s', (value) => {
    platform(value);
    expect(isMac()).toBe(true);
  });

  it.each(['Win32', 'Linux x86_64'])('is false for %s', (value) => {
    platform(value);
    expect(isMac()).toBe(false);
  });

  it('prefers the user agent data platform when the browser has it', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgentData: { platform: 'macOS' } });
    expect(isMac()).toBe(true);
  });

  it('is false without a navigator', () => {
    vi.stubGlobal('navigator', undefined);
    expect(isMac()).toBe(false);
  });
});
