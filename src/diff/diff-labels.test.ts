import { englishDiffLabels, resolveDiffLabels } from './diff-labels';

describe('the diff labels', () => {
  it('are English by default', () => {
    const labels = resolveDiffLabels();
    expect(labels).toBe(englishDiffLabels);
    expect(labels.added).toBe('Added');
    expect(labels.removed).toBe('Removed');
    expect(labels.moved).toBe('Moved');
    expect(labels.movedAway).toBe('Moved away');
    expect(labels.inserted).toBe('inserted');
    expect(labels.insertedEnd).toBe('end inserted');
    expect(labels.deleted).toBe('deleted');
    expect(labels.deletedEnd).toBe('end deleted');
    expect(labels.emptyTask).toBe('Task');
  });

  it('name the attributes they know a change of, and say only Changed otherwise', () => {
    expect(englishDiffLabels.changed([])).toBe('Changed');
    expect(englishDiffLabels.changed(['level'])).toBe('Changed heading level');
    expect(englishDiffLabels.changed(['kind', 'level'])).toBe('Changed block style, heading level');
    expect(englishDiffLabels.changed(['checked'])).toBe('Changed checkbox');
    expect(englishDiffLabels.changed(['alt'])).toBe('Changed alt text');
    expect(englishDiffLabels.changed(['points', 'alt'])).toBe('Changed alt text');
    expect(englishDiffLabels.changed(['points'])).toBe('Changed');
  });

  it('take the host overrides, and keep English for a key left out or undefined', () => {
    const labels = resolveDiffLabels({ added: 'Ajout\u00e9', removed: undefined });
    expect(labels.added).toBe('Ajout\u00e9');
    expect(labels.removed).toBe('Removed');
    expect(resolveDiffLabels({ moved: undefined })).toBe(englishDiffLabels);
  });
});
