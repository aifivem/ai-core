import { resourceExport } from "@aicore-fivem/lib/client";
import type { AppearanceClientAdapter } from "@aicore-fivem/shared";

const appearance = resourceExport("ai-appearance");

/**
 * ai-appearance: its `ApplyAppearance` / `GetPedAppearance` client exports (the `Appearance` JSON), `WearOutfit` /
 * `ReloadSkin` for job outfits. Its clothing stores and barbers are its own places (the server checks the store on
 * save), so `openMenu` is left out.
 */
export const aiAppearance: AppearanceClientAdapter = {
  resource: "ai-appearance",
  apply: (ped, data) => void appearance.ApplyAppearance(ped, data),
  read: (ped) => appearance.GetPedAppearance(ped),
  wearOutfit: (outfit) => appearance.WearOutfit(outfit),
  reloadSkin: () => appearance.ReloadSkin(),
};
