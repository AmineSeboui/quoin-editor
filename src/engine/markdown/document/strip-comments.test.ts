import { describe, expect, it } from 'vitest';
import { atom, text } from '../../model/inline';
import type { EngineBlock, Mark } from '../../model/types';
import { stripComments } from './strip-comments';

const comment = (id: string): Mark => ({ type: 'comment', attrs: { id } });
const bold: Mark = { type: 'bold' };

const block = (regions: EngineBlock['regions']): EngineBlock => ({
  id: 'a',
  type: 'TABLE',
  indent: 0,
  attrs: {},
  regions,
});

describe('stripComments', () => {
  it('removes every comment anchor from every region and keeps the other marks', () => {
    const result = stripComments(
      block({
        'cell:0:0': [text('a', [comment('c1'), comment('c2'), bold]), atom('mention', { id: '1', label: 'A' }, [comment('c1')])],
        'cell:0:1': [text('b', [bold])],
      }),
    );
    expect(result.regions).toEqual({
      'cell:0:0': [text('a', [bold]), atom('mention', { id: '1', label: 'A' })],
      'cell:0:1': [text('b', [bold])],
    });
  });

  it('returns the same block when it holds no comment anchor', () => {
    const plain = block({ 'cell:0:0': [text('a', [bold])] });
    expect(stripComments(plain)).toBe(plain);
  });
});
