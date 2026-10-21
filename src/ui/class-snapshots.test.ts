const SNAPSHOTS = import.meta.glob<string>('/src/**/__snapshots__/*.classes.test.tsx.snap', {
  query: '?raw',
  import: 'default',
  eager: true,
});

// Each family sets one value, so two of its classes under the same variants means the stylesheet's order picks one,
// not the class list.
const FAMILIES: readonly (readonly [family: string, utility: RegExp])[] = [
  ['display', /^(block|inline|inline-block|flex|inline-flex|grid|inline-grid|contents|table|hidden)$/],
  ['position', /^(static|fixed|absolute|relative|sticky)$/],
  ['rounded', /^rounded(-(none|xs|sm|md|lg|xl|\dxl|full|\[.+\]))?$/],
  ['shadow', /^shadow(-(none|2xs|xs|sm|md|lg|xl|2xl|\[.+\]))?$/],
  ['background', /^bg-(?!clip-|origin-|repeat|no-repeat|cover|contain|fixed|local|scroll|blend-|linear-|radial-|conic-)/],
  ['font weight', /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/],
  ['text size', /^text-(xs|sm|base|lg|\d?xl)(\/.+)?$/],
  ['text align', /^text-(left|center|right|justify|start|end)$/],
  ['text color', /^text-(?!(xs|sm|base|lg|\d?xl)(\/.+)?$|(left|center|right|justify|start|end)$|(wrap|nowrap|balance|pretty|ellipsis|clip)$|shadow-|opacity-)/],
  ['border width', /^border(-(0|2|4|8))?$/],
  ['border color', /^border-(?!(0|2|4|8)$|[xytrblse](-|$)|(solid|dashed|dotted|double|none|hidden|collapse|separate)$|spacing)/],
  ['outline width', /^outline(-(0|1|2|4|8))?$/],
  ['outline style', /^outline-(solid|dashed|dotted|double|none|hidden)$/],
  ['outline color', /^outline-(?!offset-|(0|1|2|4|8)$|(solid|dashed|dotted|double|none|hidden)$)/],
  ['flex direction', /^flex-(row|col)(-reverse)?$/],
  ['flex', /^flex-(1|auto|initial|none)$/],
  ['justify', /^justify-(?!items-|self-)/],
  ['transition', /^transition(-|$)/],
];
const SCALED =
  /^-?(p[xysetrbl]?|m[xysetrbl]?|min-w|max-w|min-h|max-h|w|h|size|gap-x|gap-y|gap|z|opacity|leading|tracking|whitespace|cursor|overflow-x|overflow-y|overflow|inset-x|inset-y|inset|top|right|bottom|left|translate-x|translate-y|origin|duration|select|items|self|shrink|grow)-/;

function familyOf(utility: string): string | undefined {
  return FAMILIES.find(([, pattern]) => pattern.test(utility))?.[0] ?? SCALED.exec(utility)?.[1];
}

function clashesIn(classes: readonly string[]): string[] {
  const first = new Map<string, string>();
  const clashes: string[] = [];
  for (const name of classes) {
    const variants = name.slice(0, name.lastIndexOf(':') + 1);
    const family = familyOf(name.slice(variants.length));
    if (family === undefined) continue;
    const seen = first.get(variants + family);
    if (seen === undefined) first.set(variants + family, name);
    else clashes.push(`${seen} ${name}`);
  }
  return clashes;
}

const classesOf = (entry: string) => entry.slice(entry.lastIndexOf(': ') + 1).split(' ').filter(Boolean);

const pinned = Object.entries(SNAPSHOTS).flatMap(([file, source]) =>
  [...source.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(([, entry]) => ({ file, entry })),
);

describe('the guard over pinned class lists', () => {
  it.each([
    [['rounded-md', 'shadow-xs', 'rounded-lg'], ['rounded-md rounded-lg']],
    [['bg-popover', 'hover:bg-accent', 'bg-transparent'], ['bg-popover bg-transparent']],
    [['text-sm', 'text-muted-foreground', 'text-base/7', 'text-destructive'], ['text-sm text-base/7', 'text-muted-foreground text-destructive']],
    [['-mx-1', 'my-1', 'mx-2', 'p-4', 'py-1', 'ps-3', 'ps-12'], ['-mx-1 mx-2', 'ps-3 ps-12']],
    [['z-50', 'opacity-0', 'font-medium', 'leading-none', 'w-72', 'h-9', 'z-10', 'opacity-70', 'font-semibold', 'leading-tight', 'w-80', 'h-8'], [
      'z-50 z-10',
      'opacity-0 opacity-70',
      'font-medium font-semibold',
      'leading-none leading-tight',
      'w-72 w-80',
      'h-9 h-8',
    ]],
  ])('finds two classes of one family under the same variants in %j', (classes, clashes) => {
    expect(clashesIn(classes)).toEqual(clashes);
  });

  it.each([
    [['p-4', 'py-1', 'ps-3', 'pe-1']],
    [['border', 'border-border', 'focus-visible:outline-2', 'focus-visible:outline-solid', 'focus-visible:outline-[var(--quoin-ring)]', 'focus-visible:outline-offset-2']],
    [['flex', 'flex-col', 'flex-1', 'pointer-coarse:not-data-current:hidden', 'text-sm', 'text-muted-foreground', 'text-center']],
    [["[&_svg:not([class*='size-'])]:size-4", 'size-9', 'shadow-md', 'data-[highlighted]:shadow-[inset_2px_0_0_var(--quoin-foreground)]']],
  ])('lets classes of different families, or of one family under different variants, through: %j', (classes) => {
    expect(clashesIn(classes)).toEqual([]);
  });
});

describe('a pinned class list', () => {
  it('is read from every class snapshot', () => {
    expect(Object.keys(SNAPSHOTS).length).toBeGreaterThanOrEqual(3);
    expect(pinned.length).toBeGreaterThan(300);
  });

  it('holds at most one class of a single-valued family under the same variants', () => {
    const clashes = pinned.flatMap(({ file, entry }) =>
      clashesIn(classesOf(entry)).map((clash) => `${file} ${entry.slice(0, entry.lastIndexOf(': '))}: ${clash}`),
    );
    expect(clashes).toEqual([]);
  });
});
