import type { ReactNode } from "react"
import { Tooltip as TooltipPrimitive } from "radix-ui"

/** TGIANN tooltip (tgiann-ui components.md): `#161616`, ring, 1.2vh text, 300 ms delay; names an icon-only button. */
export function Tooltip({
  content,
  children,
}: {
  content: string
  children: ReactNode
}) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="z-[100] max-w-[24vh] animate-fade rounded-[0.6vh] bg-float px-[0.8vh] py-[0.4vh] text-[1.2vh] text-white/90 [box-shadow:0_0_0_1px_rgba(255,255,255,0.08),0_0.4vh_1.2vh_rgba(0,0,0,0.4)]"
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
