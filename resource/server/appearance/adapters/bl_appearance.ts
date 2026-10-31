import { mysql } from "@aicore-fivem/mysql";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { AppearanceAdapter } from "@aicore-fivem/shared";
import { citizenidOf, modelOf } from "../citizen";

/**
 * bl_appearance 1.3.5 (appearance.sql, src/server/appearance/getters.ts): table `appearance` keyed by bl_bridge's
 * player id (the citizenid / ESX identifier, the citizenid on ai-core); `skin` (with the `model` hash), `clothes` and
 * `tattoos` JSON, merged into one look as its `GetPlayerAppearance` does.
 */
export const blAppearance: AppearanceAdapter = {
  resource: "bl_appearance",
  version: "1.3.5",
  load: async (charId) => {
    const citizenid = await citizenidOf(charId);
    if (!citizenid) return null;
    const row = await mysql.single<{
      skin: string | null;
      clothes: string | null;
      tattoos: string | null;
    }>("SELECT skin, clothes, tattoos FROM appearance WHERE id = ?", [
      citizenid,
    ]);
    if (!row?.skin) return null;
    const skin: unknown = JSON.parse(row.skin);
    const clothes: unknown = row.clothes ? JSON.parse(row.clothes) : {};
    if (!isRecord(skin)) return null;
    const model = modelOf(skin.model);
    if (model === null) return null;
    const tattoos: unknown = row.tattoos ? JSON.parse(row.tattoos) : [];
    return {
      model,
      data: { ...skin, ...(isRecord(clothes) ? clothes : {}), tattoos },
    };
  },
};
