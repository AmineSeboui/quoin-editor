"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
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
function DropdownMenu({ modal = false, ...props }: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root modal={modal} {...props} />;
}

function DropdownMenuSub(props: React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub {...props} />;
}

const DropdownMenuTrigger = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>
>(function DropdownMenuTrigger(props, ref) {
  return <DropdownMenuPrimitive.Trigger ref={ref} data-slot="dropdown-menu-trigger" {...props} />;
});

const DropdownMenuContent = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(function DropdownMenuContent({ className, sideOffset = 4, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(MENU_CONTENT, className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
});

const DropdownMenuGroup = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Group>
>(function DropdownMenuGroup(props, ref) {
  return <DropdownMenuPrimitive.Group ref={ref} data-slot="dropdown-menu-group" {...props} />;
});

const DropdownMenuItem = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }
>(function DropdownMenuItem({ className, inset, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Item
      ref={ref}
      data-slot="dropdown-menu-item"
      data-inset={inset}
      className={cn(MENU_ITEM, className)}
      {...props}
    />
  );
});

const DropdownMenuCheckboxItem = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(function DropdownMenuCheckboxItem({ className, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      ref={ref}
      data-slot="dropdown-menu-checkbox-item"
      className={cn(MENU_CHECKABLE_ITEM, className)}
      {...props}
    >
      <span className={MENU_ITEM_INDICATOR}>
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
});

const DropdownMenuRadioGroup = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.RadioGroup>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioGroup>
>(function DropdownMenuRadioGroup(props, ref) {
  return <DropdownMenuPrimitive.RadioGroup ref={ref} data-slot="dropdown-menu-radio-group" {...props} />;
});

const DropdownMenuRadioItem = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem> & { indicator?: React.ReactNode }
>(function DropdownMenuRadioItem(
  { className, children, indicator = <CircleIcon className="size-2 fill-current" />, ...props },
  ref,
) {
  return (
    <DropdownMenuPrimitive.RadioItem
      ref={ref}
      data-slot="dropdown-menu-radio-item"
      className={cn(MENU_CHECKABLE_ITEM, className)}
      {...props}
    >
      <span className={MENU_ITEM_INDICATOR}>
        <DropdownMenuPrimitive.ItemIndicator>{indicator}</DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
});

const DropdownMenuLabel = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & { inset?: boolean }
>(function DropdownMenuLabel({ className, inset, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Label
      ref={ref}
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={cn(MENU_LABEL, className)}
      {...props}
    />
  );
});

const DropdownMenuSeparator = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(function DropdownMenuSeparator({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.Separator
      ref={ref}
      data-slot="dropdown-menu-separator"
      className={cn(MENU_SEPARATOR, className)}
      {...props}
    />
  );
});

const DropdownMenuShortcut = /* @__PURE__ */ React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<"span">>(
  function DropdownMenuShortcut({ className, ...props }, ref) {
    return <span ref={ref} data-slot="dropdown-menu-shortcut" className={cn(MENU_SHORTCUT, className)} {...props} />;
  },
);

const DropdownMenuSubTrigger = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & { inset?: boolean }
>(function DropdownMenuSubTrigger({ className, inset, children, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      ref={ref}
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset}
      className={cn(MENU_SUB_TRIGGER, className)}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-4" />
    </DropdownMenuPrimitive.SubTrigger>
  );
});

const DropdownMenuSubContent = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(function DropdownMenuSubContent({ className, ...props }, ref) {
  return (
    <DropdownMenuPrimitive.SubContent
      ref={ref}
      data-slot="dropdown-menu-sub-content"
      className={cn(MENU_SUB_CONTENT, className)}
      {...props}
    />
  );
});

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
