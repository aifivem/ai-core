import type { ComponentProps } from "react"
import { Switch as SwitchPrimitive } from "radix-ui"
import { cn } from "../../lib/utils"

/**
 * TGIANN toggle (docs/design.md): 4.4 x 2.4vh pill; on = green track, off = control grey, white knob. Inner height
 * 2.4 - 2 * 0.3 = 1.8vh = knob; travel 4.4 - 0.6 - 1.8 = 2vh. Hit area grows to 2.8vh.
 */
export function Switch({
  className,
  ...props
}: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "relative inline-flex h-[2.4vh] w-[4.4vh] shrink-0 cursor-pointer items-center rounded-full p-[0.3vh] transition-colors duration-150 before:absolute before:-inset-[0.2vh] before:content-[''] disabled:cursor-not-allowed disabled:opacity-40 data-[state=checked]:bg-tgi-green data-[state=unchecked]:bg-control-hover",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-[1.8vh] rounded-full transition-[transform,background-color] duration-150 ease-out data-[state=checked]:[transform:translateX(2vh)] data-[state=checked]:bg-text data-[state=unchecked]:bg-text-2"
      />
    </SwitchPrimitive.Root>
  )
}
