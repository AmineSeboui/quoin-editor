import { flatText } from './html-dom';
import { parseStyle } from './html-styles';

const NOT_DRAWN = /^(?:none|hidden|0*\.?0+[a-z]*)$/;

const drawn = (border = 'none'): boolean => !border.split(/\s+/).some((part) => NOT_DRAWN.test(part));

/**
 * An empty paragraph drawn with a line above or below it, which is how Word and LibreOffice write a divider: Word as an
 * empty paragraph in a bordered wrapper, LibreOffice as a bordered empty paragraph.
 */
export function isRule(element: Element): boolean {
  const styles = parseStyle(element.getAttribute('style'));
  const line = drawn(styles.get('border-top')) || drawn(styles.get('border-bottom'));
  return line && !/\S/.test(flatText(element)) && element.querySelector('img') === null;
}
