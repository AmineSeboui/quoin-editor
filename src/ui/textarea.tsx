import * as React from "react";
import { cn } from "./cn";
import { FOCUS_RING } from "./focus";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentPropsWithoutRef<"textarea">>(function Textarea(
  { className, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      data-slot="textarea"
      className={cn(
        "border-muted-foreground placeholder:text-muted-foreground flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] disabled:pointer-events-none disabled:opacity-50 md:text-sm",
        FOCUS_RING,
        "focus-visible:border-ring",
        "aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
});

export { Textarea };
