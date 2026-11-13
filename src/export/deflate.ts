/** The raw deflate of `bytes` through CompressionStream, or null where the runtime cannot write it or its stream fails. */
export async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const compressed = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(compressed).arrayBuffer());
  } catch {
    return null;
  }
}
