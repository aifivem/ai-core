import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Radix dialog in Dark Minimal: 0.6 black scrim (no blur), centred panel; Escape and the scrim close it. */
export function Dialog({ open, onOpenChange, title, description, children }: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] animate-fade bg-[rgba(0,0,0,0.6)]" />
        <DialogPrimitive.Content className="fixed inset-0 z-[91] m-auto flex h-fit w-[44vh] animate-fade flex-col gap-[1.6vh] rounded-[1.2vh] border border-line bg-panel p-[2vh] [box-shadow:inset_0_0.1vh_0_rgba(255,255,255,0.04),0_2.4vh_6.4vh_rgba(0,0,0,0.6)]">
          <div className="flex flex-col gap-[0.6vh]">
            <DialogPrimitive.Title className="text-[1.8vh] font-semibold leading-[1.2]">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-[1.35vh] leading-[1.45] text-text-3">{description}</DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
            )}
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
