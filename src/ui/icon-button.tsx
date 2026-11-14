"use client";

import * as React from "react";
import { Button } from "./button";
import { Kbd } from "./kbd";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

type ButtonProps = React.ComponentPropsWithoutRef<typeof Button>;

type IconButtonProps = ButtonProps & {
  /** The button's accessible name, which its tooltip shows. */
  label: string;
  /** The key that does the same, already written for the platform. */
  shortcut?: string;
  "data-slot"?: string;
};

type TriggerProps = ButtonProps & { ownDescription?: string; ownSlot?: string; "data-slot"?: string };

/** Radix adds the tooltip to the trigger's description and names it a tooltip trigger. The name already says what the
 *  tooltip says, so only the caller's own description is kept, and the button keeps its own slot. */
const UndescribedButton = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, TriggerProps>(function UndescribedButton(
  { ownDescription, ownSlot, "data-slot": _triggerSlot, ...props },
  ref,
) {
  return <Button ref={ref} {...props} data-slot={ownSlot ?? "button"} aria-describedby={ownDescription} />;
});

/** An icon-only button, named by `label` and showing it, with its shortcut, in a tooltip. */
const IconButton = /* @__PURE__ */ React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    shortcut,
    variant = "ghost",
    size = "icon-sm",
    "aria-describedby": ownDescription,
    "data-slot": ownSlot,
    onPointerDown,
    onPointerLeave,
    ...props
  },
  ref,
) {
  const [open, setOpen] = React.useState(false);
  // Radix closes an open tooltip on a press but lets one already waiting for its delay open after it, over the menu
  // or the drag the press began; a press holds the tooltip shut until the pointer leaves.
  const pressed = React.useRef(false);
  return (
    <Tooltip open={open} onOpenChange={(next) => setOpen(next && !pressed.current)}>
      <TooltipTrigger asChild>
        <UndescribedButton
          ref={ref}
          variant={variant}
          size={size}
          aria-label={label}
          ownDescription={ownDescription}
          ownSlot={ownSlot}
          onPointerDown={(event) => {
            pressed.current = true;
            setOpen(false);
            onPointerDown?.(event);
          }}
          onPointerLeave={(event) => {
            pressed.current = false;
            onPointerLeave?.(event);
          }}
          {...props}
        />
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {shortcut !== undefined && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
});

export { IconButton };
