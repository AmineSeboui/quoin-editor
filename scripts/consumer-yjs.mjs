/**
 * How the consumer check installs yjs, an optional peer, in turn, typechecking the samples after each. Releases of
 * lib0 after 0.2.111 declare Uint8Array<ArrayBuffer>, which needs TypeScript 5.7, so on TypeScript 5.4 lib0 is held
 * there first, with every declaration checked; then the check takes what a host installing yjs today gets, under the
 * skipLibCheck the docs give a host on an older TypeScript.
 * @type {readonly { uninstall?: string[]; install: string[]; skipLibCheck: boolean }[]}
 */
export const yjsInstalls = [
  { install: ['yjs@13.6.33', 'lib0@0.2.111'], skipLibCheck: false },
  { uninstall: ['yjs', 'lib0'], install: ['yjs@^13.6.0'], skipLibCheck: true },
];
