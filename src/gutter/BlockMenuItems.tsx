'use client';

import { Fragment } from 'react';
import type { EditorState, EngineBlock } from '../engine';
import { isTextFlow } from '../engine/commands/block-helpers';
import { useLabels } from '../i18n/use-labels';
import type { ViewController } from '../view';
import { useEditorState } from '../view/react/use-editor-state';
import type { BlockMenuAction } from './block-menu-items';
import { CalloutMenus } from './CalloutMenus';
import { ColorMenu } from './ColorMenu';
import { MenuIcon } from './MenuIcon';
import type { MenuKit } from './menu-kit';
import { shortcutHint } from './shortcut-hint';
import { TurnIntoMenu } from './TurnIntoMenu';

const DESTRUCTIVE = 'text-destructive focus:text-destructive';

const wholeState = (state: EditorState) => state;

type BlockMenuItemsProps = {
  kit: MenuKit;
  controller: ViewController;
  blocks: readonly EngineBlock[];
  styled: readonly EngineBlock[];
  title: string;
  actions: readonly BlockMenuAction[];
};

type ActionItemProps = { kit: MenuKit; controller: ViewController; action: BlockMenuAction; blockIds: string[] };

function ActionItem({ kit, controller, action, blockIds }: ActionItemProps) {
  const { keyNames } = useLabels();
  const hint = action.shortcut === undefined ? null : shortcutHint(action.shortcut, controller.isMac, keyNames);
  return (
    <kit.Item
      className={action.destructive ? DESTRUCTIVE : undefined}
      aria-keyshortcuts={hint?.aria}
      onSelect={() => action.run(controller, blockIds)}
    >
      <MenuIcon icon={action.icon} />
      {action.label}
      {hint !== null && <kit.Shortcut aria-hidden="true">{hint.text}</kit.Shortcut>}
    </kit.Item>
  );
}

export function BlockMenuItems({ kit, controller, blocks, styled, title, actions }: BlockMenuItemsProps) {
  const state = useEditorState(controller, wholeState);
  const blockIds = blocks.map((block) => block.id);
  const shown = actions.filter((action) => action.available?.(state, blockIds) ?? true);
  const anyText = styled.some((block) => isTextFlow(state.schema, block));
  const anyMarkdown = styled.some((block) => block.type === 'MARKDOWN');
  const allCallouts = styled.length > 0 && styled.every((block) => block.type === 'CALLOUT');
  return (
    <>
      <kit.Label className="text-muted-foreground text-xs">{title}</kit.Label>
      {anyText && <TurnIntoMenu kit={kit} controller={controller} blockIds={styled.map((block) => block.id)} />}
      {anyMarkdown && <ColorMenu kit={kit} controller={controller} blocks={styled} />}
      {allCallouts && <CalloutMenus kit={kit} controller={controller} blocks={styled} />}
      {(anyText || anyMarkdown || allCallouts) && <kit.Separator />}
      {shown.map((action) => (
        <Fragment key={action.id}>
          {action.destructive && <kit.Separator />}
          <ActionItem kit={kit} controller={controller} action={action} blockIds={blockIds} />
        </Fragment>
      ))}
    </>
  );
}
