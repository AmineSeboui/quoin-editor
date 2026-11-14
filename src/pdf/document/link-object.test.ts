// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { linkObject } from './link-object';

const rect = [10, 20, 30, 40] as const;
const value = (object: ReturnType<typeof linkObject>) => (object && 'value' in object ? object.value : null);

describe('linkObject', () => {
  it('writes a link to an address as a URI action over its area, with no border', () => {
    expect(value(linkObject({ rect, target: { uri: 'https://quoin.dev/a(b)' } }, () => undefined))).toBe(
      '<</Type /Annot /Subtype /Link /Rect [10 20 30 40] /Border [0 0 0] /A <</S /URI /URI (https://quoin.dev/a\\(b\\))>>>>',
    );
  });

  it('percent-encodes the spaces and the characters outside ASCII of an address as UTF-8', () => {
    const written = value(linkObject({ rect, target: { uri: 'https://quoin.dev/caf\u00E9 \u4E2D' } }, () => undefined));
    expect(written).toContain('(https://quoin.dev/caf%C3%A9%20%E4%B8%AD)');
  });

  it('writes a link to a heading as its destination, and nothing for a heading with none', () => {
    const destination = (id: string) => (id === 'h1' ? '[3 0 R /XYZ 0 700 null]' : undefined);
    expect(value(linkObject({ rect, target: { heading: 'h1' } }, destination))).toContain('/Dest [3 0 R /XYZ 0 700 null]');
    expect(linkObject({ rect, target: { heading: 'gone' } }, destination)).toBeNull();
  });
});
