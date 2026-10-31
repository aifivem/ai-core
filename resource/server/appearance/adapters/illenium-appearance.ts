import { mysql } from "@aicore-fivem/mysql";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { AppearanceAdapter } from "@aicore-fivem/shared";
import { citizenidOf, modelOf } from "../citizen";

/**
 * illenium-appearance 5.7.0 (server/database/playerskins.lua, server/framework/qb/main.lua): QB mode keeps the active
 * look in `playerskins` (`citizenid`, `skin` = its appearance JSON with the `model` name, `active` = 1). ESX mode
 * writes `users.skin`, which ai-core does not have: docs/compat/appearance.md.
 */
export const illeniumAppearance: AppearanceAdapter = {
  resource: "illenium-appearance",
  version: "5.7.0",
  load: async (charId) => {
    const citizenid = await citizenidOf(charId);
    if (!citizenid) return null;
    const skin = await mysql.scalar<string>(
      "SELECT skin FROM playerskins WHERE citizenid = ? AND active = 1",
      [citizenid],
    );
    if (!skin) return null;
    const data: unknown = JSON.parse(skin);
    if (!isRecord(data)) return null;
    const model = modelOf(data.model ?? "mp_m_freemode_01");
    return model === null ? null : { model, data };
  },
};
