import { assetHref } from './resolved-asset';

const resolving = (address: unknown) => () => address as string;

describe('the address of a stored file', () => {
  it.each(['https://cdn.quoin.dev/a.pdf', 'http://x.y/a.png', 'blob:https://quoin.dev/1f2e', 'data:image/png;base64,AA', '/files/a', 'a.pdf'])(
    'is the host address %s',
    (address) => expect(assetHref(resolving(address), 'k')).toBe(address),
  );

  it.each(['javascript:alert(1)', 'vbscript:x', 'file:///etc/passwd', 'mailto:a@b.c', 'app:k', 'java\tscript:x', '', '  ', 7, undefined])(
    'is none for the host address %s',
    (address) => expect(assetHref(resolving(address), 'k')).toBeNull(),
  );

  it('is none when the host resolver throws', () => {
    const broken = () => {
      throw new Error('no such key');
    };
    expect(assetHref(broken, 'k')).toBeNull();
  });
});
