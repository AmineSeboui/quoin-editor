import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "./cn";

const SIDES = {
  top: "inset-x-0 top-0 h-auto border-b data-[state=open]:slide-in-from-top-[2.5rem] data-[state=closed]:slide-out-to-top-[2.5rem]",
  bottom:
    "inset-x-0 bottom-0 h-auto border-t data-[state=open]:slide-in-from-bottom-[2.5rem] data-[state=closed]:slide-out-to-bottom-[2.5rem]",
};

type SheetContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: keyof typeof SIDES };

/** shadcn's sheet, from the top or the bottom edge, which need no mirroring in a right-to-left canvas. */
const SheetContent = /* @__PURE__ */ React.forwardRef<React.ComponentRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  function SheetContent({ className, side = "bottom", ...props }, ref) {
    return (
      <DialogPrimitive.Content
        ref={ref}
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          SIDES[side],
          className,
        )}
        {...props}
      />
    );
  },
);

const SheetTitle = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(function SheetTitle({ className, ...props }, ref) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      data-slot="sheet-title"
      className={cn("text-base font-medium text-foreground", className)}
      {...props}
    />
  );
});

export { SheetContent, SheetTitle };
