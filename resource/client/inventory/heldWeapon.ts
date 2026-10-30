import { isRecord } from "@aicore-fivem/lib/shared";
import type { HeldWeapon } from "@aicore-fivem/shared";

/** ox_inventory's `getCurrentWeapon` answer (ai-inventory answers it too) as a `HeldWeapon`; `imageOf` for a missing picture. */
export function toHeldWeapon(
  raw: unknown,
  imageOf?: (name: string) => string,
): HeldWeapon | null {
  if (!isRecord(raw) || typeof raw.name !== "string" || !raw.name) return null;
  return {
    name: raw.name,
    label: typeof raw.label === "string" && raw.label ? raw.label : raw.name,
    image: typeof raw.image === "string" ? raw.image : imageOf?.(raw.name),
  };
}
