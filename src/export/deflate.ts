async function transcode(bytes: Uint8Array, stream: () => CompressionStream | DecompressionStream): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream())).arrayBuffer());
  } catch {
    return null;
  }
}

/** `bytes` deflated through CompressionStream, or null where the runtime cannot write `format` or its stream fails. */
export const deflate = (bytes: Uint8Array, format: CompressionFormat): Promise<Uint8Array | null> =>
  transcode(bytes, () => new CompressionStream(format));

/** `bytes` inflated through DecompressionStream, or null where the runtime cannot read `format` or the data is broken. */
export const inflate = (bytes: Uint8Array, format: CompressionFormat): Promise<Uint8Array | null> =>
  transcode(bytes, () => new DecompressionStream(format));
