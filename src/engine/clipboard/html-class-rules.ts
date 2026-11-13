const RULE = /([^{}]+)\{([^{}]*)\}/g;
const COMMENT = /\/\*[\s\S]*?\*\/|<!--|-->/g;
const CLASS_SELECTOR = /^(?:[a-z][\w-]*)?\.[a-z_][\w-]*$/i;

// Word, LibreOffice and the Cocoa writer behind TextEdit and Pages set sizes, colours and decorations on classes in a
// style sheet. Rules for a class are written onto the elements they match, ahead of their own style so it still wins.
// Rules for a bare element are left out: they restyle every heading or paragraph of the page the paste came from.
export function inlineClassRules(body: Element): void {
  const sheets = new Map<Element, string>();
  for (const sheet of Array.from(body.ownerDocument.querySelectorAll('style'))) {
    for (const [, selectors, declarations] of (sheet.textContent ?? '').replace(COMMENT, '').matchAll(RULE)) {
      for (const selector of selectors.split(',').map((part) => part.trim())) {
        if (!CLASS_SELECTOR.test(selector)) continue;
        for (const element of Array.from(body.querySelectorAll(selector))) {
          sheets.set(element, `${sheets.get(element) ?? ''}${declarations};`);
        }
      }
    }
  }
  for (const [element, rules] of sheets) element.setAttribute('style', rules + (element.getAttribute('style') ?? ''));
}
