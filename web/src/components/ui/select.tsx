import { Select as SelectPrimitive } from "radix-ui"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCheck, faChevronDown } from "@fortawesome/free-solid-svg-icons"
import { cn } from "../../lib/utils"

interface Option {
  value: string
  label: string
}

interface SelectProps {
  value: string | undefined
  options: Option[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  "aria-label"?: string
}

/** Radix select in TGIANN: pill trigger, floating `#161616` list, the picked row in green text. */
export function Select({
  value,
  options,
  onChange,
  placeholder,
  className,
  ...props
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onChange}>
      <SelectPrimitive.Trigger
        data-slot="select-trigger"
        aria-label={props["aria-label"]}
        className={cn(
          "flex h-[3.6vh] w-full items-center justify-between gap-[0.8vh] rounded-full border border-white/8 bg-[#2222224D] px-[1.4vh] text-[1.35vh] text-text transition-[border-color] duration-150 hover:border-white/14 data-[placeholder]:text-text-4 data-[state=open]:border-tgi-green-40",
          className
        )}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="text-[1.1vh] text-text-3"
          />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className="z-[100] max-h-[40vh] min-w-[var(--radix-select-trigger-width)] animate-fade overflow-hidden rounded-[1vh] bg-float p-[0.4vh] [box-shadow:0_0_0_1px_rgba(255,255,255,0.08),0_0.8vh_2.4vh_rgba(0,0,0,0.5)]"
        >
          <SelectPrimitive.Viewport>
            <SelectPrimitive.Group>
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="relative flex h-[3.2vh] cursor-pointer items-center rounded-[0.6vh] pr-[1vh] pl-[3vh] text-[1.3vh] text-text-2 outline-none select-none data-[highlighted]:bg-white/6 data-[highlighted]:text-text data-[state=checked]:text-tgi-green"
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-[1vh]">
                    <FontAwesomeIcon icon={faCheck} className="text-[1.1vh]" />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Group>
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
