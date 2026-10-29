import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../lib/utils";

/** Dark Minimal buttons (docs/design.md): outline primary, secondary, destructive; `filled` for the view's one main action. */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-[0.8vh] rounded-[0.6vh] border px-[1.6vh] whitespace-nowrap transition-[background-color,color,transform] duration-150 ease-out enabled:active:[transform:scale(0.97)] disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      variant: {
        primary: "border-accent bg-panel font-semibold text-accent hover:bg-[rgba(var(--accent-rgb),0.12)]",
        secondary: "border-line bg-panel font-medium text-text-2 hover:bg-raised hover:text-text",
        destructive: "border-[rgba(var(--danger-rgb),0.6)] bg-panel font-medium text-danger hover:bg-[rgba(var(--danger-rgb),0.12)]",
        filled: "border-accent bg-accent font-semibold text-accent-text hover:bg-accent-hover",
        icon: "size-[3vh] border-line bg-raised px-0 text-[1.2vh] text-text-2 hover:text-text enabled:active:[transform:scale(0.9)]",
      },
      size: {
        md: "h-[4.2vh] text-[1.45vh]",
        sm: "h-[3.4vh] text-[1.25vh]",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  /** Shows a spinner next to the label and disables the button while an action runs. */
  busy?: boolean;
}

export function Button({ className, variant, size, busy = false, disabled, children, ...props }: ButtonProps) {
  return (
    <button
      type="button"
      data-slot="button"
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {busy && <FontAwesomeIcon icon={faSpinner} spin data-icon="inline-start" />}
      {children}
    </button>
  );
}
