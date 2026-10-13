import { describe, expect, it } from 'vitest';
import { buildState } from '../test-support/build-state';
import { DIVIDER_FIXTURE } from '../test-support/fixtures';
import { isActive } from './is-active';

describe('isActive', () => {
  it('reads MARKDOWN kinds and their attributes', () => {
    const heading = buildState(['## a'], { block: 0, offset: 0 });
    expect(isActive(heading, 'heading')).toBe(true);
    expect(isActive(heading, 'heading', { level: 2 })).toBe(true);
    expect(isActive(heading, 'heading', { level: 1 })).toBe(false);
    expect(isActive(heading, 'paragraph')).toBe(false);
    expect(isActive(buildState(['- [x] t'], { block: 0, offset: 0 }), 'task', { checked: true })).toBe(true);
    expect(isActive(buildState(['> q'], { block: 0, offset: 0 }), 'quote')).toBe(true);
  });

  it('reads block types, also for a node selection', () => {
    const state = buildState(['a', { id: 'c', type: 'CODE', data: { language: 'ts', code: 'x' } }], { node: 1 });
    expect(isActive(state, 'CODE')).toBe(true);
    expect(isActive(state, 'CODE', { language: 'ts' })).toBe(true);
    expect(isActive(state, 'CODE', { language: 'js' })).toBe(false);
    expect(isActive(state, 'MARKDOWN')).toBe(false);
  });

  it('needs every selected block to match', () => {
    const state = buildState(['- a', '- b', 'c'], { anchor: { block: 0, offset: 0 }, head: { block: 2, offset: 1 } });
    expect(isActive(state, 'bullet')).toBe(false);
    const bullets = buildState(['- a', '- b', 'c'], { anchor: { block: 0, offset: 0 }, head: { block: 1, offset: 1 } });
    expect(isActive(bullets, 'bullet')).toBe(true);
    expect(isActive(buildState(['- a', '- b'], { blocks: [0, 1] }), 'bullet')).toBe(true);
  });

  it('reads marks over a range only when every character has them', () => {
    const state = buildState(['**ab**c'], { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 2 } });
    expect(isActive(state, 'bold')).toBe(true);
    const wider = buildState(['**ab**c'], { anchor: { block: 0, offset: 0 }, head: { block: 0, offset: 3 } });
    expect(isActive(wider, 'bold')).toBe(false);
    expect(isActive(state, 'italic')).toBe(false);
  });

  it('reads the marks around a collapsed caret, links only from the inside', () => {
    const state = buildState(['**ab**'], { block: 0, offset: 2 });
    expect(isActive(state, 'bold')).toBe(true);
    const link = buildState(['[ab](https://a.b)'], { block: 0, offset: 1 });
    expect(isActive(link, 'link', { href: 'https://a.b' })).toBe(true);
    expect(isActive(buildState(['[ab](https://a.b)'], { block: 0, offset: 2 }), 'link')).toBe(false);
  });

  it('is false for unknown names, void blocks as marks and an empty document', () => {
    expect(isActive(buildState(['a'], { block: 0, offset: 0 }), 'nope')).toBe(false);
    expect(isActive(buildState([DIVIDER_FIXTURE], { node: 0 }), 'bold')).toBe(false);
    expect(isActive(buildState([], null), 'paragraph')).toBe(false);
    expect(isActive(buildState([], null), 'bold')).toBe(false);
  });
});
