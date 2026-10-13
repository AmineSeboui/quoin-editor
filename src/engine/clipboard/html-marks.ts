import { isPaletteColor } from '../markdown/palette';
import { sanitizeHref } from '../markdown/urls';
import { addMark, hasMark, removeMark } from '../model/marks';
import type { Mark } from '../model/types';
import { tagName } from './html-dom';
import {
  fontWeight,
  hasDecoration,
  isItalicStyle,
  nearestPaletteColor,
  parseStyle,
  verticalAlign,
} from './html-styles';

function linkMark(element: Element): Mark | null {
  const href = sanitizeHref(element.getAttribute('href') ?? '');
  if (href === null || href === '') return null;
  const title = element.getAttribute('title');
  return { type: 'link', attrs: title ? { href, title } : { href } };
}

function highlightMark(element: Element): Mark {
  const color = element.getAttribute('data-color') ?? '';
  return isPaletteColor(color) ? { type: 'highlight', attrs: { color } } : { type: 'highlight' };
}

export function elementMarks(element: Element, inherited: readonly Mark[]): readonly Mark[] {
  const tag = tagName(element);
  const styles = parseStyle(element.getAttribute('style'));
  let marks = inherited;
  const add = (mark: Mark) => {
    marks = addMark(marks, mark);
  };

  const link = tag === 'a' ? linkMark(element) : null;
  if (link !== null) add(link);
  const linked = hasMark(marks, 'link');

  const weight = fontWeight(styles);
  if (weight !== null ? weight >= 600 : tag === 'b' || tag === 'strong') add({ type: 'bold' });
  else if (weight !== null) marks = removeMark(marks, 'bold');

  const slanted = isItalicStyle(styles);
  if (slanted ?? (tag === 'i' || tag === 'em')) add({ type: 'italic' });
  else if (slanted === false) marks = removeMark(marks, 'italic');

  if (tag === 'u' || (!linked && hasDecoration(styles, 'underline'))) add({ type: 'underline' });
  if (tag === 's' || tag === 'del' || tag === 'strike' || hasDecoration(styles, 'line-through')) {
    add({ type: 'strike' });
  }
  if (tag === 'code' || tag === 'kbd') add({ type: 'code' });
  const align = verticalAlign(styles);
  if (tag === 'sub' || align === 'sub') add({ type: 'sub' });
  if (tag === 'sup' || align === 'super') add({ type: 'sup' });
  if (tag === 'mark') add(highlightMark(element));

  const color = linked ? null : nearestPaletteColor(styles.get('color') ?? '', 'text');
  if (color !== null) add({ type: 'color', attrs: { color } });
  const background = nearestPaletteColor(styles.get('background-color') ?? '', 'background');
  if (background !== null) add({ type: 'background', attrs: { color: background } });
  return marks;
}
