import type { ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/** TGIANN modal (tgiann-ui components.md): 0.6 black scrim, solid panel, display-font title; Escape and the scrim close it. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] animate-fade bg-black/60" />
        <DialogPrimitive.Content className="fixed inset-0 z-[91] m-auto flex h-fit w-[46vh] animate-pop flex-col gap-[1.8vh] rounded-[1.6vh] bg-panel p-[2.4vh] [box-shadow:0_0_0_1px_rgba(255,255,255,0.1),inset_0_0.1vh_0_rgba(255,255,255,0.06),0_2.4vh_6.4vh_rgba(0,0,0,0.6)]">
          <div className="flex flex-col gap-[0.8vh]">
            <DialogPrimitive.Title className="font-display text-[1.8vh] leading-[1.15] font-extrabold tracking-[-0.01em] uppercase">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="text-[1.4vh] leading-[1.45] text-text-3">
                {description}
              </DialogPrimitive.Description>
            ) : (
              <DialogPrimitive.Description className="sr-only">
                {title}
              </DialogPrimitive.Description>
            )}
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
