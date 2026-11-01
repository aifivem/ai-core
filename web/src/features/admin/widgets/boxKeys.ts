import type { KeyboardEvent } from "react";

/** Enter saves (by leaving the box); Esc reverts it and must not close the panel. */
export function keys(revert: () => void) {
  return (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      revert();
    }
  };
}
