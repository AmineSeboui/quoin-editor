export type Attr = readonly [name: string, value: string | true | undefined];

/** Text, unescaped, or an element. */
export type HtmlNode = string | HtmlElement;

export type HtmlElement = {
  readonly tag: string;
  readonly attrs: readonly Attr[];
  readonly children: HtmlNode[];
  /** Trusted markup that stands for the children, such as the output of `renderMath`. */
  readonly html?: string;
};

const ATTRIBUTE_NAME = /^[A-Za-z][A-Za-z0-9_.:-]*$/;

/** The attributes an element is written with: those with a value and a name no attribute can break out of. */
export const writtenAttrs = (attrs: readonly Attr[]) =>
  attrs.filter((attr): attr is readonly [string, string | true] => attr[1] !== undefined && ATTRIBUTE_NAME.test(attr[0]));

export const element = (tag: string, attrs: readonly Attr[] = [], children: HtmlNode[] = [], html?: string): HtmlElement => ({
  tag,
  attrs,
  children,
  html,
});
