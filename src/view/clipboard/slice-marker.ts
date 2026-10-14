export const QUOIN_SLICE_TYPE = 'application/x-quoin+json';

const MARKER = /data-quoin-slice=(["'])([A-Za-z0-9+/=]*)\1/;

// btoa and atob only handle one byte per character, so the JSON travels as UTF-8 bytes.
function encode(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decode(encoded: string): string {
  const binary = atob(encoded);
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

export function wrapSliceHTML(html: string, json: string): string {
  return `<div data-quoin-slice="${encode(json)}">${html}</div>`;
}

export function readSliceHTML(html: string): string | null {
  const encoded = MARKER.exec(html)?.[2];
  if (!encoded) return null;
  try {
    return decode(encoded);
  } catch {
    return null;
  }
}
