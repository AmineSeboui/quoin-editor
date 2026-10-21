"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { cn } from "./cn";
import {
  MENU_CHECKABLE_ITEM,
  MENU_CONTENT,
  MENU_ITEM,
  MENU_ITEM_INDICATOR,
  MENU_LABEL,
  MENU_SEPARATOR,
  MENU_SHORTCUT,
  MENU_SUB_CONTENT,
  MENU_SUB_TRIGGER,
} from "./menu-styles";

// A modal menu hides everything around it from assistive technology, the editor's tab stop and links with it, which
// leaves focusable content hidden. Radix keeps Tab inside an open menu either way.
function ContextMenu({ modal = false, ...props }: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root data-slot="context-menu" modal={modal} {...props} />;
}

function ContextMenuSub(props: React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub data-slot="context-menu-sub" {...props} />;
}

const ContextMenuTrigger = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Trigger>
>(function ContextMenuTrigger(props, ref) {
  return <ContextMenuPrimitive.Trigger ref={ref} data-slot="context-menu-trigger" {...props} />;
});

const ContextMenuContent = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(function ContextMenuContent({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        ref={ref}
        data-slot="context-menu-content"
        className={cn(MENU_CONTENT, className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
});

const ContextMenuGroup = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Group>
>(function ContextMenuGroup(props, ref) {
  return <ContextMenuPrimitive.Group ref={ref} data-slot="context-menu-group" {...props} />;
});

const ContextMenuItem = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & { inset?: boolean }
>(function ContextMenuItem({ className, inset, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Item
      ref={ref}
      data-slot="context-menu-item"
      data-inset={inset}
      className={cn(MENU_ITEM, className)}
      {...props}
    />
  );
});

const ContextMenuCheckboxItem = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.CheckboxItem>
>(function ContextMenuCheckboxItem({ className, children, ...props }, ref) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      ref={ref}
      data-slot="context-menu-checkbox-item"
      className={cn(MENU_CHECKABLE_ITEM, className)}
      {...props}
    >
      <span className={MENU_ITEM_INDICATOR}>
        <ContextMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
});

const ContextMenuRadioGroup = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.RadioGroup>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioGroup>
>(function ContextMenuRadioGroup(props, ref) {
  return <ContextMenuPrimitive.RadioGroup ref={ref} data-slot="context-menu-radio-group" {...props} />;
});

const ContextMenuRadioItem = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.RadioItem> & { indicator?: React.ReactNode }
>(function ContextMenuRadioItem(
  { className, children, indicator = <CircleIcon className="size-2 fill-current" />, ...props },
  ref,
) {
  return (
    <ContextMenuPrimitive.RadioItem
      ref={ref}
      data-slot="context-menu-radio-item"
      className={cn(MENU_CHECKABLE_ITEM, className)}
      {...props}
    >
      <span className={MENU_ITEM_INDICATOR}>
        <ContextMenuPrimitive.ItemIndicator>{indicator}</ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
});

const ContextMenuLabel = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Label> & { inset?: boolean }
>(function ContextMenuLabel({ className, inset, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Label
      ref={ref}
      data-slot="context-menu-label"
      data-inset={inset}
      className={cn(MENU_LABEL, className)}
      {...props}
    />
  );
});

const ContextMenuSeparator = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(function ContextMenuSeparator({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.Separator
      ref={ref}
      data-slot="context-menu-separator"
      className={cn(MENU_SEPARATOR, className)}
      {...props}
    />
  );
});

const ContextMenuShortcut = /* @__PURE__ */ React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(function ContextMenuShortcut(
  { className, ...props },
  ref,
) {
  return <span ref={ref} data-slot="context-menu-shortcut" className={cn(MENU_SHORTCUT, className)} {...props} />;
});

const ContextMenuSubTrigger = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger> & { inset?: boolean }
>(function ContextMenuSubTrigger({ className, inset, children, ...props }, ref) {
  return (
    <ContextMenuPrimitive.SubTrigger
      ref={ref}
      data-slot="context-menu-sub-trigger"
      data-inset={inset}
      className={cn(MENU_SUB_TRIGGER, className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </ContextMenuPrimitive.SubTrigger>
  );
});

const ContextMenuSubContent = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof ContextMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(function ContextMenuSubContent({ className, ...props }, ref) {
  return (
    <ContextMenuPrimitive.SubContent
      ref={ref}
      data-slot="context-menu-sub-content"
      className={cn(MENU_SUB_CONTENT, className)}
      {...props}
    />
  );
});

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuLabel,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
};
