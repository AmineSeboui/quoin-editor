import { describe, expect, it } from 'vitest';
import { firstNamed } from './first-named';

describe('firstNamed', () => {
  it('keeps the first name that is neither empty nor only white space', () => {
    expect(firstNamed('Box', 'Task')).toBe('Box');
    expect(firstNamed(undefined, 'Task')).toBe('Task');
    expect(firstNamed('', 'Task')).toBe('Task');
    expect(firstNamed(' \t\n ', 'Task')).toBe('Task');
    expect(firstNamed('  ', '', 'https://x.y')).toBe('https://x.y');
  });
});
