import { callExport } from "@aicore-fivem/lib/server";
import type { EmsAdapter } from "@aicore-fivem/shared";

/**
 * Wasabi Ambulance v2 (written from its docs, docs.wasabiscripts.com/advanced-series/wasabi-ambulance-v2/exports):
 * `addToDistress(source)` puts the player on its distress list and tells every on-duty medic (only with its dispatch
 * set to `"internal"`); the jobs and message stay its own. It has no count export.
 */
export const wasabiAmbulanceV2Ems: EmsAdapter = {
  resource: "wasabi_ambulance_v2",
  distress: (source) => {
    callExport("wasabi_ambulance_v2", "addToDistress", source);
    return true;
  },
};
