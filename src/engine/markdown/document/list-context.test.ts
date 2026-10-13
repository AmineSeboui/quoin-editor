import { describe, expect, it } from 'vitest';
import { text } from '../../model/inline';
import type { EngineBlock } from '../../model/types';
import { createListContext } from './list-context';

let counter = 0;
const line = (attrs: EngineBlock['attrs'], indent = 0, body = 'x'): EngineBlock => ({
  id: `b${++counter}`,
  type: 'MARKDOWN',
  indent,
  attrs,
  regions: { text: body ? [text(body)] : [] },
});
const other = (type: string, indent = 0): EngineBlock => ({
  id: `b${++counter}`,
  type,
  indent,
  attrs: {},
  regions: {},
});

describe('createListContext', () => {
  it('writes children inside the content column of the item above them', () => {
    const context = createListContext();
    context.place(line({ kind: 'ordered', start: 9 }));
    const second = context.place(line({ kind: 'ordered', start: 1 }));
    const child = context.place(line({ kind: 'paragraph' }, 1));
    expect(second.hang).toBe(4);
    expect(child.prefix).toBe('    ');
    expect(child.parent).toBe(second.container);
    expect(child.residual).toBe(0);
  });

  it('closes the containers that are not shallower than a block and reports the depth it is missing', () => {
    const context = createListContext();
    const item = context.place(line({ kind: 'bullet' }));
    const toggle = context.place(other('TOGGLE', 1));
    const deep = context.place(line({ kind: 'paragraph' }, 4));
    expect(deep.parent).toBe(toggle.container);
    expect(deep.residual).toBe(2);
    expect(deep.prefix).toBe('  ');
    const next = context.place(line({ kind: 'paragraph' }));
    expect(next.closed).toEqual([toggle.container, item.container]);
    expect(context.finish()).toEqual([]);
  });

  it('hands back the containers still open, innermost first', () => {
    const context = createListContext();
    const outer = context.place(other('TOGGLE'));
    const inner = context.place(line({ kind: 'task', checked: false }, 1));
    expect(context.finish()).toEqual([inner.container, outer.container]);
  });

  it('numbers a run from its first item and renumbers the block it hands back', () => {
    const context = createListContext();
    const first = context.place(line({ kind: 'ordered', start: 7 }));
    const second = context.place(line({ kind: 'ordered', start: 1 }));
    expect(first.block.attrs.start).toBe(7);
    expect(second.block.attrs.start).toBe(8);
    expect(context.place(line({ kind: 'paragraph' })).block.attrs.kind).toBe('paragraph');
    expect(context.place(line({ kind: 'ordered', start: 3 })).block.attrs.start).toBe(3);
  });

  it('keeps counting an outer run across deeper blocks only', () => {
    const context = createListContext();
    context.place(line({ kind: 'ordered', start: 1 }));
    context.place(line({ kind: 'ordered', start: 5 }, 1));
    expect(context.place(line({ kind: 'ordered', start: 1 })).block.attrs.start).toBe(2);
    expect(context.place(line({ kind: 'ordered', start: 5 }, 1)).block.attrs.start).toBe(5);
  });

  it('marks the items that cannot be read back as nested right under their parent', () => {
    const context = createListContext();
    expect(context.place(line({ kind: 'bullet' }, 0, '')).bare).toBe(true);
    expect(context.place(line({ kind: 'task', checked: false }, 0, '')).bare).toBe(false);
    expect(context.place(line({ kind: 'ordered', start: 1 }, 0, 'x')).fragile).toBe(false);
    expect(context.place(line({ kind: 'ordered', start: 1 }, 1, 'x')).fragile).toBe(false);
    expect(context.place(line({ kind: 'ordered', start: 4 }, 0, 'x')).fragile).toBe(true);
    expect(context.place(line({ kind: 'bullet' }, 1, '')).fragile).toBe(true);
    expect(context.place(line({ kind: 'paragraph' }, 1, '')).fragile).toBe(false);
  });
});
