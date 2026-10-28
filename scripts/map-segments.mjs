const DIGITS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const VALUE = new Map([...DIGITS].map((digit, i) => [digit, i]));

function decodeSegment(text, previous) {
  const fields = [];
  let value = 0;
  let shift = 0;
  for (const digit of text) {
    const bits = VALUE.get(digit);
    if (bits === undefined) throw new Error(`The sourcemap mappings hold "${digit}", which is not a base64 digit.`);
    value += (bits & 31) << shift;
    shift += 5;
    if (bits & 32) continue;
    fields.push(value & 1 ? -(value >>> 1) : value >>> 1);
    value = 0;
    shift = 0;
  }
  return fields.map((field, i) => field + previous[i]);
}

function encodeValue(value) {
  let rest = value < 0 ? (-value << 1) | 1 : value << 1;
  let text = '';
  do {
    const bits = rest & 31;
    rest >>>= 5;
    text += DIGITS[rest > 0 ? bits | 32 : bits];
  } while (rest > 0);
  return text;
}

/** The segments of each generated line, every field absolute: column, then source, line, column and name. */
export function decodeMappings(mappings) {
  const previous = [0, 0, 0, 0, 0];
  return mappings.split(';').map((line) => {
    previous[0] = 0;
    return line === ''
      ? []
      : line.split(',').map((text) => {
          const segment = decodeSegment(text, previous);
          segment.forEach((field, i) => (previous[i] = field));
          return segment;
        });
  });
}

export function encodeMappings(lines) {
  const previous = [0, 0, 0, 0, 0];
  return lines
    .map((segments) => {
      previous[0] = 0;
      return segments
        .map((segment) => {
          const text = segment.map((field, i) => encodeValue(field - previous[i])).join('');
          segment.forEach((field, i) => (previous[i] = field));
          return text;
        })
        .join(',');
    })
    .join(';');
}

const samePlace = (segment, before) =>
  segment.length === before.length && segment.every((field, i) => i === 0 || field === before[i]);

/**
 * The mappings without a segment that maps to the same source place as the one before it on its line: a lookup finds
 * the same place either way.
 */
export const withoutRepeatedSegments = (mappings) =>
  encodeMappings(decodeMappings(mappings).map((segments) => segments.filter((segment, i) => i === 0 || !samePlace(segment, segments[i - 1]))));
