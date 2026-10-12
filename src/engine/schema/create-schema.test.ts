import { describe, expect, it } from 'vitest';
import { createSchema } from './create-schema';

describe('createSchema', () => {
  it('holds the core specs by type', () => {
    const schema = createSchema();
    expect([...schema.blocks.keys()]).toEqual([
      'MARKDOWN', 'CALLOUT', 'CODE', 'IMAGE', 'FILE', 'DIVIDER', 'TOGGLE', 'TABLE', 'EMBED', 'BOOKMARK', 'MATH', 'TOC',
    ]);
    expect(schema.marks.get('link')).toMatchObject({ rank: 0, inclusive: false });
    expect(schema.marks.get('bold')).toMatchObject({ rank: 2, inclusive: true });
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
      marks: [{ type: 'kbd', rank: 7.5, inclusive: true }],
      atoms: [{ type: 'emoji', toMarkdown: () => null, plainText: (attrs) => attrs.name }],
      defaultTextBlock: 'NOTE',
    });
    expect(schema.marks.get('kbd')).toMatchObject({ rank: 7.5 });
    expect(schema.marks.has('bold')).toBe(true);
    expect(schema.atoms.get('emoji')?.plainText({ name: 'x' })).toBe('x');
    expect(schema.atoms.has('math')).toBe(true);
    expect(schema.defaultTextBlock).toBe('NOTE');
  });

  it('gives every core mark the rank the model uses and comment its stacking', () => {
    const { marks } = createSchema();
    expect([...marks.values()].map((m) => [m.type, m.rank])).toEqual([
      ['link', 0], ['comment', 1], ['bold', 2], ['italic', 3], ['underline', 4], ['strike', 5],
      ['sub', 6], ['sup', 7], ['highlight', 8], ['color', 9], ['background', 10], ['code', 11],
    ]);
    expect(marks.get('comment')).toMatchObject({ inclusive: false, stackable: true });
    expect(marks.get('code')).toMatchObject({ inclusive: true });
    expect(marks.get('bold')?.stackable).toBeUndefined();
  });
});

describe('core atoms', () => {
  const atoms = createSchema().atoms;
  const mention = atoms.get('mention')!;
  const math = atoms.get('math')!;

  it('writes a mention as a mention link', () => {
    expect(mention.toMarkdown({ id: '7', label: 'Ada' })).toBe('[@Ada](mention:7)');
    expect(mention.toMarkdown({ id: '7', label: 'Ada', kind: 'page' })).toBe('[@Ada](mention:page:7)');
    expect(mention.plainText({ id: '7', label: 'Ada' })).toBe('@Ada');
  });

  it.each(['a[b', 'a]b', 'a\\b', 'a\nb'])('has no markdown form for the mention label %j', (label) => {
    expect(mention.toMarkdown({ id: '7', label })).toBeNull();
  });

  it('has no markdown form for a mention without an id', () => {
    expect(mention.toMarkdown({ label: 'Ada' })).toBeNull();
  });

  it('writes inline math between dollars', () => {
    expect(math.toMarkdown({ latex: 'x^2' })).toBe('$x^2$');
    expect(math.plainText({ latex: 'x^2' })).toBe('x^2');
  });

  it.each(['', 'a$b', ' a', 'a ', '\ta', 'a\\', 'a\nb'])('has no markdown form for the latex %j', (latex) => {
    expect(math.toMarkdown({ latex })).toBeNull();
  });
});
