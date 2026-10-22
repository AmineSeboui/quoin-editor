/** The raw deflate of `bytes` through CompressionStream, or null where the runtime cannot write it. */
export async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  let stream: CompressionStream;
  try {
    stream = new CompressionStream('deflate-raw');
  } catch {
    return null;
  }
  const compressed = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(compressed).arrayBuffer());
}
