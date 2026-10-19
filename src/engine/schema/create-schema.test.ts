import { describe, expect, it } from 'vitest';
import { createSchema } from './create-schema';

describe('createSchema', () => {
  it('holds the core specs by type', () => {
    const schema = createSchema();
    expect([...schema.blocks.keys()]).toEqual([
      'MARKDOWN', 'CALLOUT', 'CODE', 'IMAGE', 'FILE', 'DIVIDER', 'TOGGLE', 'TABLE', 'EMBED', 'BOOKMARK', 'MATH', 'TOC',
    ]);
    expect(schema.marks.get('link')).toEqual({ type: 'link', inclusive: false });
    expect(schema.marks.get('bold')).toEqual({ type: 'bold', inclusive: true });
    expect(schema.atoms.has('mention')).toBe(true);
    expect(schema.defaultTextBlock).toBe('MARKDOWN');
  });

  it('lets a later spec override a core one by type', () => {
    const custom = { type: 'DIVIDER', flow: 'void' as const, fromData: () => ({ attrs: { x: 1 }, regions: {} }), toData: () => ({}), initial: () => ({ attrs: {}, regions: {} }) };
    expect(createSchema({ blocks: [custom] }).blocks.get('DIVIDER')).toBe(custom);
  });

  it('keeps the position of an overridden core spec and appends new ones', () => {
    const spec = (type: string) => ({ type, flow: 'void' as const, fromData: () => ({ attrs: {}, regions: {} }), toData: () => ({}), initial: () => ({ attrs: {}, regions: {} }) });
    const schema = createSchema({ blocks: [spec('CODE'), spec('NOTE')] });
    expect([...schema.blocks.keys()].slice(0, 3)).toEqual(['MARKDOWN', 'CALLOUT', 'CODE']);
    expect([...schema.blocks.keys()].at(-1)).toBe('NOTE');
  });

  it('adds input marks and atoms next to the core ones and lets the default text block change', () => {
    const schema = createSchema({
      marks: [{ type: 'kbd', inclusive: true }],
      atoms: [{ type: 'emoji', plainText: (attrs) => attrs.name }],
      defaultTextBlock: 'NOTE',
    });
    expect(schema.marks.get('kbd')).toEqual({ type: 'kbd', inclusive: true });
    expect(schema.marks.has('bold')).toBe(true);
    expect(schema.atoms.get('emoji')?.plainText({ name: 'x' })).toBe('x');
    expect(schema.atoms.has('math')).toBe(true);
    expect(schema.defaultTextBlock).toBe('NOTE');
  });

  it('extends every core mark but a link and a comment over text typed at its end', () => {
    const { marks } = createSchema();
    expect([...marks.values()].filter((mark) => !mark.inclusive).map((mark) => mark.type)).toEqual(['link', 'comment']);
    expect(marks.size).toBe(12);
  });
});

describe('core atoms', () => {
  const atoms = createSchema().atoms;

  it('read a mention as its label after an at sign', () => {
    expect(atoms.get('mention')?.plainText({ id: '7', label: 'Ada' })).toBe('@Ada');
  });

  it('read inline math as its latex', () => {
    expect(atoms.get('math')?.plainText({ latex: 'x^2' })).toBe('x^2');
  });
});
