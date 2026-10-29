import type { ButtonHTMLAttributes } from "react";

/** Dark Minimal buttons (docs/design.md): outline primary, secondary, destructive; `filled` for a dialog's main action. */
type Variant = "primary" | "secondary" | "destructive" | "filled";

const VARIANTS: Record<Variant, string> = {
  primary: "border-accent bg-panel text-accent font-semibold hover:bg-[rgba(var(--accent-rgb),0.12)]",
  secondary: "border-line bg-panel text-text-2 font-medium hover:bg-raised hover:text-text",
  destructive: "border-[rgba(var(--danger-rgb),0.6)] bg-panel text-danger font-medium hover:bg-[rgba(var(--danger-rgb),0.12)]",
  filled: "border-accent bg-accent text-accent-text font-semibold hover:bg-accent-hover",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
}

export function Button({ variant = "secondary", size = "md", className = "", ...props }: Props) {
  const height = size === "md" ? "h-[4.2vh] text-[1.45vh]" : "h-[3.4vh] text-[1.25vh]";
  return (
    <button
      type="button"
      className={`flex items-center justify-center gap-[0.8vh] rounded-[0.6vh] border-[0.1vh] px-[1.6vh] transition-colors duration-150 active:[transform:scale(0.97)] disabled:pointer-events-none disabled:opacity-40 ${height} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
