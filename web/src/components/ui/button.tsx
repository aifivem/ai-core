import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleNotch } from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../lib/utils";

/**
 * TGIANN buttons (docs/design.md): pill shapes; `primary` is the view's one filled green action, `secondary` and
 * `ghost` are grey, `destructive` confirms a delete, `danger` is the soft red chip, `icon` a round icon button.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-[0.8vh] rounded-full px-[1.8vh] whitespace-nowrap transition-[background-color,color,transform] duration-150 ease-out enabled:active:[transform:scale(0.97)] disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "bg-tgi-green font-bold text-tgi-green-text enabled:hover:bg-tgi-green-hover",
        secondary:
          "bg-control font-medium text-text enabled:hover:bg-control-hover",
        ghost:
          "bg-white/6 font-medium text-text-2 enabled:hover:bg-white/12 enabled:hover:text-text",
        destructive:
          "bg-danger-solid font-semibold text-text enabled:hover:bg-[#dc2626]",
        danger:
          "bg-danger-bg font-semibold text-danger enabled:hover:bg-[rgba(239,68,68,0.25)]",
        icon: "size-[3.6vh] bg-control px-0 text-[1.3vh] text-text-2 enabled:hover:bg-control-hover enabled:hover:text-text enabled:active:[transform:scale(0.92)]",
      },
      size: {
        md: "h-[3.6vh] text-[1.35vh]",
        sm: "h-[3.2vh] text-[1.25vh]",
      },
    },
    compoundVariants: [{ variant: "icon", className: "h-[3.6vh]" }],
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

interface ButtonProps
  extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  /** Shows a spinner next to the label and disables the button while an action runs. */
  busy?: boolean;
}

export function Button({
  className,
  variant,
  size,
  busy = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      data-slot="button"
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {busy && (
        <FontAwesomeIcon icon={faCircleNotch} spin data-icon="inline-start" />
      )}
      {children}
    </button>
  );
}
