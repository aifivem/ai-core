import { resourceExport } from "@aicore-fivem/lib/client";
import type { AppearanceClientAdapter } from "@aicore-fivem/shared";

const appearance = resourceExport("ai-appearance");

/** ai-appearance: its `ApplyAppearance` / `GetPedAppearance` client exports (the `Appearance` JSON). */
export const aiAppearance: AppearanceClientAdapter = {
  resource: "ai-appearance",
  apply: (ped, data) => void appearance.ApplyAppearance(ped, data),
  read: (ped) => appearance.GetPedAppearance(ped),
};
