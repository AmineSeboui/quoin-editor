import { englishPresenceLabels, resolvePresenceLabels } from './presence-labels';

describe('the presence labels', () => {
  it('are English by default, listing several names in one sentence', () => {
    const labels = resolvePresenceLabels();
    expect(labels).toBe(englishPresenceLabels);
    expect(labels.joined(['Ada'])).toBe('Ada joined');
    expect(labels.joined(['Ada', 'Bea'])).toBe('Ada and Bea joined');
    expect(labels.left(['Ada', 'Bea', 'Cy'])).toBe('Ada, Bea and Cy left');
    expect(labels.here(['Ada'])).toBe('Ada is here');
    expect(labels.here(['Ada', 'Bea'])).toBe('Ada and Bea are here');
    expect(labels.caret('Ada')).toBe('Ada');
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const joined = (names: readonly string[]) => `${names.join(', ')} est ici`;
    const labels = resolvePresenceLabels({ joined, left: undefined });
    expect(labels.joined(['Ada'])).toBe('Ada est ici');
    expect(labels.left(['Ada'])).toBe('Ada left');
    expect(resolvePresenceLabels({ caret: undefined })).toBe(englishPresenceLabels);
  });
});
