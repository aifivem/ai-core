import type { ReactNode } from "react"
import type { Transition } from "motion/react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
  faCircleNotch,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons"
import { cn } from "../lib/utils"
import { Tooltip } from "./ui/tooltip"

/** Building blocks of a full-screen screen (docs/design.md "Panels", tgiann-multichar). */

/** Screen title and one line under it, top left. */
export function ScreenHeader({
  title,
  desc,
}: {
  title: string
  desc?: string
}) {
  return (
    <div className="flex flex-col gap-[1vh]">
      <h1 className="font-display text-[4.4vh] leading-none font-extrabold tracking-[-0.01em] whitespace-nowrap uppercase">
        {title}
      </h1>
      {desc && (
        <p className="max-w-[56vh] text-[1.6vh] leading-[1.45] text-text-2">
          {desc}
        </p>
      )}
    </div>
  )
}

const VIGNETTES = {
  radial:
    "bg-[radial-gradient(circle,rgba(0,0,0,0)_0%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0.85)_100%)]",
  left: "bg-[linear-gradient(90deg,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.45)_25%,rgba(0,0,0,0.15)_50%,rgba(0,0,0,0)_65%)]",
  /** Over the game's own scene: only enough to keep the text readable. */
  sceneRadial:
    "bg-[radial-gradient(circle,rgba(0,0,0,0)_0%,rgba(0,0,0,0)_55%,rgba(0,0,0,0.55)_100%)]",
  sceneLeft:
    "bg-[linear-gradient(90deg,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.3)_25%,rgba(0,0,0,0)_45%)]",
}

/** Darkens the screen edges so white text stays readable over the picture or the scene. */
export function Vignette({
  variant = "radial",
}: {
  variant?: keyof typeof VIGNETTES
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0", VIGNETTES[variant])}
    />
  )
}

/** Text with a round dark icon button (back, quit), top right of a screen. */
export function RoundAction({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string
  icon: IconDefinition
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex items-center gap-[1vh] rounded-full disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className="text-[1.4vh] text-text-2 transition-colors duration-150 group-enabled:group-hover:text-text">
        {label}
      </span>
      <span className="flex size-[4.4vh] items-center justify-center rounded-full bg-[#00000099] text-[#FFFFFFB2] transition-[color,background-color,transform] duration-150 ease-out group-enabled:group-hover:bg-[#101010B3] group-enabled:group-hover:text-text group-enabled:group-active:[transform:scale(0.92)]">
        <FontAwesomeIcon icon={icon} className="text-[1.7vh]" />
      </span>
    </button>
  )
}

/** Dark rounded bar that holds a screen's main buttons (bottom right). */
export function PillBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex h-[6vh] w-max items-center gap-[1vh] rounded-full bg-black/60 p-[0.5vh]",
        className
      )}
    >
      {children}
    </div>
  )
}

const PILL = {
  green: "bg-tgi-green text-tgi-green-text enabled:hover:bg-tgi-green-hover",
  dark: "bg-white/20 text-text-2 enabled:hover:bg-white/30 enabled:hover:text-text",
  danger: "bg-danger-solid text-text enabled:hover:bg-[#dc2626]",
}

interface PillButtonProps {
  label: string
  onClick: () => void
  variant?: keyof typeof PILL
  icon?: IconDefinition
  disabled?: boolean
  /** Spinner while this button's request runs. */
  pending?: boolean
  /** Round icon button; the label becomes its tooltip. */
  iconOnly?: boolean
  className?: string
}

/** A button of the pill bar: green main action, dark or red secondary ones. */
export function PillButton({
  label,
  onClick,
  variant = "green",
  icon,
  disabled,
  pending,
  iconOnly,
  className,
}: PillButtonProps) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      aria-label={iconOnly ? label : undefined}
      className={cn(
        "flex h-full items-center justify-center gap-[0.8vh] rounded-full text-[1.4vh] font-bold whitespace-nowrap uppercase transition-[background-color,color,opacity,transform] duration-150 ease-out enabled:active:[transform:scale(0.96)] disabled:cursor-not-allowed disabled:opacity-40",
        iconOnly ? "w-[5vh] px-0" : "px-[3vh]",
        PILL[variant],
        className
      )}
    >
      {pending ? (
        <FontAwesomeIcon
          icon={faCircleNotch}
          spin
          className={iconOnly ? "text-[1.8vh]" : "text-[1.4vh]"}
        />
      ) : (
        icon && (
          <FontAwesomeIcon
            icon={icon}
            className={iconOnly ? "text-[1.8vh]" : "text-[1.4vh]"}
          />
        )
      )}
      {!iconOnly && label}
    </button>
  )
  return iconOnly ? <Tooltip content={label}>{button}</Tooltip> : button
}

/**
 * CEF 103 has no CSS linear(): Motion's WAAPI springs on opacity/filter fall back to a 300 ms ease-out and drift from
 * the JS spring on x/y, so those values get their own tween of the same length.
 */
const springSoft = {
  type: "spring",
  duration: 0.35,
  bounce: 0,
  opacity: { type: "tween", duration: 0.3, ease: "easeOut" },
  filter: { type: "tween", duration: 0.3, ease: "easeOut" },
} as Transition

/** Screen columns rising in on open (opacity, small lift, light blur). */
export const screenEnter = {
  initial: { opacity: 0, y: "0.8vh", filter: "blur(4px)" },
  animate: { opacity: 1, y: "0vh", filter: "blur(0px)" },
} as const

/** Stagger between screen columns, 100 ms per column. */
export const columnDelay = (index: number): Transition => ({
  ...springSoft,
  delay: Math.min(index * 0.1, 0.3),
})
