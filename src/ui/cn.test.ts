import { cn } from './cn';

describe('cn', () => {
  it('merges conflicting tailwind utilities, last one winning', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('drops falsy values', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b');
  });

  it.each([
    ['flex items-center hidden', 'items-center hidden'],
    ['text-sm font-medium text-base', 'font-medium text-base'],
    ['text-sm text-muted-foreground text-xs', 'text-muted-foreground text-xs'],
    ['focus:text-accent-foreground text-destructive focus:text-destructive', 'text-destructive focus:text-destructive'],
    ['w-72 p-4 w-auto p-1', 'w-auto p-1'],
    ['h-9 min-w-[8rem] h-8 min-w-0', 'h-8 min-w-0'],
    ['gap-2 px-3 has-[>svg]:px-2.5 gap-1 px-2 has-[>svg]:px-2', 'gap-1 px-2 has-[>svg]:px-2'],
    ['cursor-pointer cursor-grab', 'cursor-grab'],
    ['max-h-(--radix-popper-available-height) overflow-y-auto max-h-64 overflow-y-hidden', 'max-h-64 overflow-y-hidden'],
    ["[&_svg:not([class*='size-'])]:size-4 size-6 [&_svg:not([class*='size-'])]:size-3", "size-6 [&_svg:not([class*='size-'])]:size-3"],
  ])('lets a later utility replace an earlier one setting the same thing: %s', (input, merged) => {
    expect(cn(input)).toBe(merged);
  });

  it.each([
    ['ps-12 p-0', 'p-0'],
    ['ps-12 px-0', 'px-0'],
    ['pt-2 pl-8 py-1', 'pl-8 py-1'],
    ['ps-12 sm:p-0', 'ps-12 sm:p-0'],
  ])('lets a later padding shorthand replace the sides it sets: %s', (input, merged) => {
    expect(cn(input)).toBe(merged);
  });

  it.each([
    'flex pointer-coarse:not-data-current:hidden',
    'px-3 has-[>svg]:px-2',
    'p-4 py-1 ps-3 pe-1',
    'gap-2 gap-x-1',
    'border border-border',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:outline-[var(--quoin-ring)]',
    'text-center text-muted-foreground sm:text-left',
    'flex flex-col overflow-x-hidden overflow-y-auto',
  ])('keeps utilities that set different things, or the same thing under different variants: %s', (input) => {
    expect(cn(input)).toBe(input);
  });

  it('keeps the last of a repeated class', () => {
    expect(cn('quoin rounded-md', 'quoin shadow-md rounded-md')).toBe('quoin shadow-md rounded-md');
  });
});
