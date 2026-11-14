import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./cn";
import { FOCUS_RING } from "./focus";
import { SQUARE_TAP_TARGET_FLOOR, TAP_TARGET_FLOOR } from "./touch-target";

const BASE = [
  "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg border border-transparent bg-clip-padding text-sm font-medium transition-all select-none active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  FOCUS_RING,
];

const VARIANTS = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  outline:
    "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
};

const SIZES = {
  default: `h-8 gap-1.5 px-2.5 ${TAP_TARGET_FLOOR}`,
  xs: `h-6 gap-1 rounded-[min(calc(var(--quoin-radius)-2px),10px)] px-2 text-xs [&_svg:not([class*='size-'])]:size-3 ${TAP_TARGET_FLOOR}`,
  sm: `h-7 gap-1 rounded-[min(calc(var(--quoin-radius)-2px),12px)] px-2.5 text-[0.8rem] [&_svg:not([class*='size-'])]:size-3.5 ${TAP_TARGET_FLOOR}`,
  "icon-xs": `size-6 rounded-[min(calc(var(--quoin-radius)-2px),10px)] [&_svg:not([class*='size-'])]:size-3 ${SQUARE_TAP_TARGET_FLOOR}`,
  "icon-sm": `size-7 rounded-[min(calc(var(--quoin-radius)-2px),12px)] ${SQUARE_TAP_TARGET_FLOOR}`,
};

type ButtonVariants = { variant?: keyof typeof VARIANTS | null; size?: keyof typeof SIZES | null };

/** Class variants for the button primitive, reusable on other elements. */
const buttonVariants = ({ variant = "default", size = "default", className }: ButtonVariants & { className?: string }) =>
  cn(BASE, variant && VARIANTS[variant], size && SIZES[size], className);

type ButtonProps = React.ComponentPropsWithoutRef<"button"> & ButtonVariants & { asChild?: boolean };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "default", size = "default", asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
});

export { Button, buttonVariants };
