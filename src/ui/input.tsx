import * as React from "react";
import { cn } from "./cn";
import { FOCUS_RING } from "./focus";
import { TAP_TARGET_FLOOR } from "./touch-target";

/** The look every text field shares: shadcn's input, its focus ring, its invalid state and the touch floor. */
export const INPUT = cn(
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors placeholder:text-muted-foreground file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
  FOCUS_RING,
  "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  TAP_TARGET_FLOOR,
);

const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(function Input(
  { className, type, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(INPUT, className)}
      {...props}
    />
  );
});

export { Input };
