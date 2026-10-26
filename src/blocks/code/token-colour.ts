// One colour value: a hex colour, a keyword, a colour function or a custom property, never a second declaration.
const COLOUR = /^(?:#[\da-f]{3,8}|[a-z]+|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([\w\s.,%/+-]*\)|var\(--[\w-]+\))$/i;

/**
 * The colour of a highlighter's token when it is one colour value, else undefined. A server render writes a style
 * value as it is, so a value that ends one declaration and starts another would reach the page.
 */
export const tokenColour = (color: string | undefined) => (color !== undefined && COLOUR.test(color) ? color : undefined);
