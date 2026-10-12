export function newId(): string {
  const webCrypto = globalThis.crypto;
  if (webCrypto && typeof webCrypto.randomUUID === 'function') return webCrypto.randomUUID();
  const random = () => Math.random().toString(36).slice(2, 10);
  return `blk-${Date.now().toString(36)}-${random()}${random()}`;
}
