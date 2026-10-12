import { formatShortcut } from './shortcut-label';

function platform(value: string) {
  vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue(value);
}

afterEach(() => vi.restoreAllMocks());

describe('formatShortcut', () => {
  it('uses the mac symbols with no separator', () => {
    platform('MacIntel');
    expect(formatShortcut('mod+alt+2')).toBe('⌘⌥2');
    expect(formatShortcut('mod+shift+8')).toBe('⌘⇧8');
  });

  it('uses spelled out modifiers elsewhere', () => {
    platform('Win32');
    expect(formatShortcut('mod+alt+2')).toBe('Ctrl+Alt+2');
  });

  it('upper cases a letter key', () => {
    platform('Win32');
    expect(formatShortcut('mod+b')).toBe('Ctrl+B');
  });
});
