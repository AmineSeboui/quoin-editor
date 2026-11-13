"use client";

import * as React from "react";
import { Button } from "./button";
import { cn } from "./cn";
import { Input } from "./input";
import { SQUARE_TAP_TARGET_FLOOR, TAP_TARGET_FLOOR } from "./touch-target";

const CONTROL = "[data-slot=input-group-control]";

const InputGroup = /* @__PURE__ */ React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<"div">>(
  function InputGroup({ className, ...props }, ref) {
    return (
      <div
        ref={ref}
        role="group"
        data-slot="input-group"
        className={cn(
          "group/input-group relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input transition-colors outline-none has-[>textarea]:h-auto dark:bg-input/30",
          "has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50",
          "has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-disabled:opacity-50",
          "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col",
          className,
        )}
        {...props}
      />
    );
  },
);

const ALIGNS = {
  "inline-start": "order-first justify-center ps-2 has-[>button]:ms-[-0.3rem]",
  "inline-end": "order-last justify-center pe-2 has-[>button]:me-[-0.3rem]",
  "block-start": "order-first w-full justify-start px-2.5 pt-2",
  "block-end": "order-last w-full justify-start px-2.5 pb-2",
};

type InputGroupAddonProps = React.ComponentPropsWithoutRef<"div"> & { align?: keyof typeof ALIGNS };

const InputGroupAddon = /* @__PURE__ */ React.forwardRef<HTMLDivElement, InputGroupAddonProps>(function InputGroupAddon(
  { className, align = "inline-start", onClick, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "flex h-auto cursor-text items-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>svg:not([class*='size-'])]:size-4",
        ALIGNS[align],
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if ((event.target as Element).closest("button")) return;
        event.currentTarget.parentElement?.querySelector<HTMLElement>(CONTROL)?.focus();
      }}
      {...props}
    />
  );
});

const BUTTON_SIZES = {
  xs: `h-6 gap-1 rounded-[calc(var(--quoin-radius)-3px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5 ${TAP_TARGET_FLOOR}`,
  sm: `h-7 gap-1 rounded-[calc(var(--quoin-radius)-2px)] px-2.5 ${TAP_TARGET_FLOOR}`,
  "icon-xs": `size-6 rounded-[calc(var(--quoin-radius)-3px)] p-0 has-[>svg]:p-0 ${SQUARE_TAP_TARGET_FLOOR}`,
  "icon-sm": `size-8 p-0 has-[>svg]:p-0 ${SQUARE_TAP_TARGET_FLOOR}`,
};

type InputGroupButtonProps = Omit<React.ComponentPropsWithoutRef<typeof Button>, "size"> & {
  size?: keyof typeof BUTTON_SIZES;
};

const InputGroupButton = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, InputGroupButtonProps>(
  function InputGroupButton({ className, type = "button", variant = "ghost", size = "xs", ...props }, ref) {
    return (
      <Button
        ref={ref}
        type={type}
        variant={variant}
        size={null}
        data-size={size}
        className={cn("flex items-center gap-2 text-sm shadow-none", BUTTON_SIZES[size], className)}
        {...props}
      />
    );
  },
);

const InputGroupInput = /* @__PURE__ */ React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<typeof Input>>(
  function InputGroupInput({ className, ...props }, ref) {
    return (
      <Input
        ref={ref}
        data-slot="input-group-control"
        className={cn(
          "h-full flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent",
          className,
        )}
        {...props}
      />
    );
  },
);

const InputGroupTextarea = /* @__PURE__ */ React.forwardRef<HTMLTextAreaElement, React.ComponentPropsWithoutRef<"textarea">>(
  function InputGroupTextarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="input-group-control"
        className={cn(
          "field-sizing-content max-h-32 min-h-9 w-full min-w-0 flex-1 resize-none rounded-none border-0 bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed md:text-sm",
          className,
        )}
        {...props}
      />
    );
  },
);

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupTextarea };
