import { callExport } from "@aicore-fivem/lib/client";
import type { AppearanceClientAdapter } from "@aicore-fivem/shared";

const RESOURCE = "bl_appearance";

/** Its exports answer promises; a failure there is its own, not ai-core's. */
const quiet = (answer: unknown): void =>
  void Promise.resolve(answer).catch(() => undefined);

/**
 * bl_appearance 1.3.5 (src/client/appearance/setters.ts, menu.ts, init.ts): `SetPedAppearance(ped, appearance)`
 * dresses any ped (the player's own through its player path). Its `GetPedAppearance` answers a promise, so `read` is
 * left out. `OpenMenu(type)` takes its menu names (`clothing`, `barber`, `outfits` in data/menus.lua);
 * `SetPlayerPedAppearance()` loads the player's saved look. Its outfits are its own data shape, so `wearOutfit` is
 * left out.
 */
export const blAppearance: AppearanceClientAdapter = {
  resource: RESOURCE,
  version: "1.3.5",
  apply: (ped, data) =>
    void callExport(RESOURCE, "SetPedAppearance", ped, data),
  openMenu: (menu) => (quiet(callExport(RESOURCE, "OpenMenu", menu)), true),
  reloadSkin: () => quiet(callExport(RESOURCE, "SetPlayerPedAppearance")),
};
