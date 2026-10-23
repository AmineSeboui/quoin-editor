const isHighSurrogate = (code: number): boolean => code >= 0xd800 && code <= 0xdbff;
const isLowSurrogate = (code: number): boolean => code >= 0xdc00 && code <= 0xdfff;

export function commonPrefix(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let length = 0;
  while (length < limit && a.charCodeAt(length) === b.charCodeAt(length)) length++;
  // A shared high surrogate whose partner differs must go into the edit with its partner.
  return length > 0 && isHighSurrogate(a.charCodeAt(length - 1)) ? length - 1 : length;
}

export function commonSuffix(a: string, b: string): number {
  const limit = Math.min(a.length, b.length);
  let length = 0;
  while (length < limit && a.charCodeAt(a.length - 1 - length) === b.charCodeAt(b.length - 1 - length)) length++;
  return length > 0 && isLowSurrogate(a.charCodeAt(a.length - length)) ? length - 1 : length;
}
