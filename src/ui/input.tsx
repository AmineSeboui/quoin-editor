import * as React from "react";
import { cn } from "./cn";
import { FOCUS_RING } from "./focus";
import { TAP_TARGET_FLOOR } from "./touch-target";

const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(function Input(
  { className, type, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      data-slot="input"
      className={cn(
        "border-input placeholder:text-muted-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:opacity-50 md:text-sm",
        FOCUS_RING,
        "focus-visible:border-ring",
        "aria-invalid:border-destructive",
        TAP_TARGET_FLOOR,
        className,
      )}
      {...props}
    />
  );
});

export { Input };
