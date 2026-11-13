async function through(bytes: Uint8Array, transform: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  return new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(transform)).arrayBuffer());
}

/** `bytes` deflated through CompressionStream, or null where the runtime cannot write `format` or its stream fails. */
export async function deflate(bytes: Uint8Array, format: CompressionFormat): Promise<Uint8Array | null> {
  try {
    return await through(bytes, new CompressionStream(format));
  } catch {
    return null;
  }
}

/** `bytes` inflated through DecompressionStream, or null where the runtime cannot read `format` or the data is broken. */
export async function inflate(bytes: Uint8Array, format: CompressionFormat): Promise<Uint8Array | null> {
  try {
    return await through(bytes, new DecompressionStream(format));
  } catch {
    return null;
  }
}
