import type { ReactNode } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";

/**
 * TGIANN floating surface (`#161616`, ring) anchored to a control. Focus stays in the anchor (typing filters a list),
 * Escape closes the popover first and is marked handled so the panel stays open.
 */
export function Popover({
  open,
  onOpenChange,
  anchor,
  children,
  width,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Anchor asChild>{anchor}</PopoverPrimitive.Anchor>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.stopPropagation()}
          style={{ width }}
          className="z-[100] animate-fade overflow-hidden rounded-[1vh] bg-float p-[0.4vh] [box-shadow:0_0_0_1px_rgba(255,255,255,0.08),0_0.8vh_2.4vh_rgba(0,0,0,0.5)]"
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
