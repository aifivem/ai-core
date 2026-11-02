import { callExport } from "@aifivem/lib/server";
import type { MdtAdapter } from "@aifivem/shared";

const RESOURCE = "codem-mdtv2";

/**
 * Codem MDT v2 1.3 (escrowed; `hasWarrant(citizenid)` confirmed by the scripts that call it, e.g. qbx_smallresources'
 * isWanted): only the warrant query. It takes no records from scripts and has no documented open export.
 */
export const codemMdt: MdtAdapter = {
  resource: RESOURCE,
  version: "1.3",
  hasWarrant: async (citizenid) => {
    // A Lua export that waits inside reaches JavaScript as a Promise; Lua truth: anything but nil and false.
    const answer: unknown = await callExport(RESOURCE, "hasWarrant", citizenid);
    return answer != null && answer !== false;
  },
};
