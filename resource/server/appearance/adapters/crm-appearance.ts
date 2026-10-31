import { mysql } from "@aicore-fivem/mysql";
import type { AppearanceAdapter } from "@aicore-fivem/shared";
import { citizenidOf, modelOf } from "../citizen";

/**
 * crm-appearance (no public docs; read from tgiann-multichar 2.2.1 server/editable.lua and client/editable.lua, no
 * version published): on QB it keeps the active look in qb-clothing's `playerskins` table (`model`, `skin` JSON).
 */
export const crmAppearance: AppearanceAdapter = {
  resource: "crm-appearance",
  version: "",
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
