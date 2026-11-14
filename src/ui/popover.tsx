import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { useDirection } from "@radix-ui/react-direction";
import { cn } from "./cn";
import { FLOATING_SURFACE, SURFACE_MOTION } from "./menu-styles";

function Popover(props: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />;
}

const PopoverTrigger = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(function PopoverTrigger(props, ref) {
  return <PopoverPrimitive.Trigger ref={ref} data-slot="popover-trigger" {...props} />;
});

const PopoverAnchor = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Anchor>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Anchor>
>(function PopoverAnchor(props, ref) {
  return <PopoverPrimitive.Anchor ref={ref} data-slot="popover-anchor" {...props} />;
});

const PopoverContent = /* @__PURE__ */ React.forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(function PopoverContent({ className, align = "center", sideOffset = 4, ...props }, ref) {
  const dir = useDirection();
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        dir={dir}
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          FLOATING_SURFACE,
          "flex w-72 origin-(--radix-popover-content-transform-origin) flex-col gap-2.5 p-2.5 text-sm focus:outline-hidden",
          SURFACE_MOTION,
          className,
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});

export { Popover, PopoverAnchor, PopoverTrigger, PopoverContent };
