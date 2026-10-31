import { callExport } from "@aicore-fivem/lib/client";
import type { AppearanceClientAdapter } from "@aicore-fivem/shared";

const RESOURCE = "crm-appearance";

/** crm-appearance (from tgiann-multichar 2.2.1 and p_bridge 1.2.5): `crm_set_ped_appearance` / `crm_get_ped_appearance`. */
export const crmAppearance: AppearanceClientAdapter = {
  resource: RESOURCE,
  apply: (ped, data) =>
    void callExport(RESOURCE, "crm_set_ped_appearance", ped, data),
  read: (ped) => callExport(RESOURCE, "crm_get_ped_appearance", ped),
};
