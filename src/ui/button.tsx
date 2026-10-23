import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "./cn";
import { FOCUS_RING } from "./focus";
import { SQUARE_TAP_TARGET_FLOOR, TAP_TARGET_FLOOR } from "./touch-target";

const BASE = [
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow,opacity] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 shrink-0",
  FOCUS_RING,
];

const VARIANTS = {
  default:
    "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
  outline:
    "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
  ghost: "hover:bg-accent hover:text-accent-foreground",
};

const SIZES = {
  default: `h-9 px-4 py-2 has-[>svg]:px-3 ${TAP_TARGET_FLOOR}`,
  xs: `h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3 ${TAP_TARGET_FLOOR}`,
  sm: `h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 ${TAP_TARGET_FLOOR}`,
  "icon-xs": `size-6 rounded-md [&_svg:not([class*='size-'])]:size-3 ${SQUARE_TAP_TARGET_FLOOR}`,
  "icon-sm": `size-8 ${SQUARE_TAP_TARGET_FLOOR}`,
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
