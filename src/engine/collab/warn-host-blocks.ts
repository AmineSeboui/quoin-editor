// Bundlers replace `process.env.NODE_ENV` at build time; the engine depends on no Node types.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

export function warnHostBlocks(): void {
  if (typeof process !== 'undefined' && process?.env?.NODE_ENV === 'production') return;
  console.warn(
    'Quoin: blocks were supplied to a collaborative editor and ignored, since the shared document holds its content. ' +
      'Supply its starting blocks once and keep the ones it emits.',
  );
}
