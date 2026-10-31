import { mysql } from "@aicore-fivem/mysql";
import type { AppearanceAdapter } from "@aicore-fivem/shared";
import { citizenidOf, modelOf } from "../citizen";

/**
 * qb-clothing 1.2.0 (server.lua, client.lua): `playerskins` (`citizenid`, `model` = the ped model hash as text,
 * `skin` = its skin JSON, `active` = 1).
 */
export const qbClothing: AppearanceAdapter = {
  resource: "qb-clothing",
  version: "1.2.0",
  load: async (charId) => {
    const citizenid = await citizenidOf(charId);
    if (!citizenid) return null;
    const row = await mysql.single<{ model: string; skin: string }>(
      "SELECT model, skin FROM playerskins WHERE citizenid = ? AND active = 1",
      [citizenid],
    );
    const model = modelOf(row?.model);
    return row?.skin && model !== null
      ? { model, data: JSON.parse(row.skin) as unknown }
      : null;
  },
};
