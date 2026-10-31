import { callExport } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { AppearanceAdapter } from "@aicore-fivem/shared";
import { citizenidOf, modelOf } from "../citizen";

/**
 * rcore_clothing (no public docs; read from tgiann-multichar 2.2.1 server/editable.lua, no version published):
 * `getSkinByIdentifier(identifier)` answers `{ ped_model, skin }` for a framework id (the citizenid on ai-core).
 */
const RESOURCE = "rcore_clothing";
export const rcoreClothing: AppearanceAdapter = {
  resource: RESOURCE,
  version: "",
  load: async (charId) => {
    const citizenid = await citizenidOf(charId);
    if (!citizenid) return null;
    const found: unknown = callExport(
      RESOURCE,
      "getSkinByIdentifier",
      citizenid,
    );
    if (!isRecord(found) || found.skin == null) return null;
    const model = modelOf(found.ped_model);
    return model === null ? null : { model, data: found.skin };
  },
};
