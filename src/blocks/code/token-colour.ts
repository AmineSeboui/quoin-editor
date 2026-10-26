// What could end the declaration, open a comment or a rule, or load a resource.
const UNSAFE = /[;{}\\"'<>!]|\/\*|(?:url|image|image-set|expression)\(/i;

/**
 * The colour of a highlighter's token, or undefined when it holds what could leave the `color` declaration or load a
 * resource. A server render writes a style value as it is, so a value that ends one declaration and starts another
 * would reach the page.
 */
export const tokenColour = (color: string | undefined) => (color !== undefined && !UNSAFE.test(color) ? color : undefined);
