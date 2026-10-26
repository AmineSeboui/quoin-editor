// @vitest-environment node
import { yjsInstalls } from './consumer-yjs.mjs';

describe('the yjs a consumer check installs', () => {
  it('holds lib0 at the release TypeScript 5.4 reads with every declaration checked', () => {
    expect(yjsInstalls[0]).toEqual({ install: ['yjs@13.6.33', 'lib0@0.2.111'], skipLibCheck: false });
  });

  it('then takes the yjs and lib0 a host installing yjs today gets, as the docs advise for TypeScript 5.4', () => {
    expect(yjsInstalls[1]).toEqual({ uninstall: ['yjs', 'lib0'], install: ['yjs@^13.6.0'], skipLibCheck: true });
    expect(yjsInstalls).toHaveLength(2);
  });
});
