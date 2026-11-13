import { toggleMark } from '../engine';
import { isActive } from '../engine/commands/is-active';
import type { ToolbarItem } from '../extensions/ui-types';
import type { QuoinLabels } from '../i18n/labels';
import { Link } from '../icons';
import type { KitItem } from './toolbar-button';

export function markItem(mark: string, title: string, icon: ToolbarItem['icon']): ToolbarItem {
  return {
    id: mark,
    title,
    icon,
    isActive: (state) => isActive(state, mark),
    run: (controller) => void controller.run(toggleMark(mark)),
  };
}

export const linkItem = (labels: QuoinLabels, openLink: () => void): KitItem => ({
  id: 'link',
  title: labels.link,
  icon: Link,
  opensDialog: true,
  run: openLink,
});
