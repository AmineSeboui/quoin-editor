const CONFIG = '--config e2e/vite.config.ts';

// CI serves the harness built, where a page load is one bundle instead of the hundreds of modules the dev server
// hands over on every navigation, and the development machine keeps the dev server so a change needs no build.
export const harnessServer = (mode?: 'dist') => {
  const flags = mode === undefined ? CONFIG : `${CONFIG} --mode ${mode}`;
  return process.env.CI ? `vite build ${flags} && vite preview ${flags}` : `vite ${flags}`;
};

/** The port the harness is served on. Two checkouts running the suites at once each set `QUOIN_E2E_PORT`, so neither reuses the other's server. */
export const harnessPort = (mode?: 'dist') => Number(process.env.QUOIN_E2E_PORT ?? 5179) + (mode === 'dist' ? 1 : 0);
