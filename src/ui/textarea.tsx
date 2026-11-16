import * as React from "react";
import { cn } from "./cn";
import { FOCUS_RING } from "./focus";

const Textarea = /* @__PURE__ */ React.forwardRef<HTMLTextAreaElement, React.ComponentPropsWithoutRef<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
          FOCUS_RING,
          "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Textarea };
