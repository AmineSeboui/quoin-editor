const ESCAPES: Readonly<Record<string, string>> = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' };

// XML 1.0 cannot hold the C0 controls but tab, newline and carriage return, nor U+FFFE, U+FFFF or a lone surrogate (a
// pattern with the u flag sees one as a code point of its own). The C1 controls it allows go too, as text holds none.
const NOT_XML = /(?![\t\n\r])\p{Cc}|[\uD800-\uDFFF\uFFFE\uFFFF]/gu;

/** Text or an attribute value as XML, with the characters XML cannot hold dropped. */
export const escapeXml = (text: string): string => text.replace(NOT_XML, '').replace(/[<>&"']/g, (char) => ESCAPES[char]);

export type XmlAttrs = Readonly<Record<string, string | number | undefined>>;

/** An element around `inner`, XML already written; attributes with no value are left out. */
export function xmlElement(name: string, attrs: XmlAttrs = {}, inner = ''): string {
  const written = Object.entries(attrs)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
    .map(([key, value]) => ` ${key}="${escapeXml(String(value))}"`)
    .join('');
  return inner === '' ? `<${name}${written}/>` : `<${name}${written}>${inner}</${name}>`;
}

export const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
