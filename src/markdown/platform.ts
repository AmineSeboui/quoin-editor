type NavigatorWithData = Navigator & { userAgentData?: { platform?: string } };

/** True on macOS and iOS, where the shortcut modifier is Command rather than Ctrl. Read on each call so a stubbed navigator is honoured. */
export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  const { userAgentData, platform } = navigator as NavigatorWithData;
  return /mac|iphone|ipad/i.test(userAgentData?.platform || platform || '');
}
