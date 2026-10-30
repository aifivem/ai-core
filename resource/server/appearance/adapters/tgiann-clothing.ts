import { mysql } from "@aicore-fivem/mysql";
import type { AppearanceAdapter } from "@aicore-fivem/shared";
import { players } from "../../player/registry";

/**
 * tgiann-clothing (4.x): table `tgiann_skin` keyed by the framework id (`tgiCore.getCid`, which is the citizenid on
 * ai-core's ESX and QB bridges); `model` is the ped model hash, `skin` its skin data (`SetPedAppearance` takes it).
 */
export const tgiannClothing: AppearanceAdapter = {
  resource: "tgiann-clothing",
  version: "4.1.0",
  load: async (charId) => {
    const citizenid =
      players.byCharacter(charId)?.citizenid ??
      (await mysql.scalar<string>(
        "SELECT citizenid FROM ai_core_characters WHERE id = ?",
        [charId],
      ));
    if (!citizenid) return null;
    const row = await mysql.single<{
      model: number | null;
      skin: string | null;
    }>("SELECT model, skin FROM tgiann_skin WHERE citizenid = ?", [citizenid]);
    if (!row?.skin) return null;
    const skin = JSON.parse(row.skin) as { pedModel?: unknown };
    const model = Number(row.model ?? skin.pedModel);
    return Number.isInteger(model) && model !== 0
      ? { model: model | 0, data: skin }
      : null;
  },
};
