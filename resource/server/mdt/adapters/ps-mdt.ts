import { mysql } from "@aifivem/mysql";
import type { MdtAdapter } from "@aifivem/shared";

/**
 * ps-mdt 3.1.4 (written from its source: server/backend/warrants.lua, server/exports.lua): no server record or
 * warrant exports (its screen opens from the client export `OpenMDT`, `client/mdt`). A warrant is a row of
 * `mdt_reports_warrants` (`citizenid`, `expirydate`), active while `expirydate >= NOW()` (closing one sets it to
 * now): read only, the same test ps-mdt's own active list uses.
 */
export const psMdt: MdtAdapter = {
  resource: "ps-mdt",
  version: "3.1.4",
  hasWarrant: async (citizenid) =>
    (await mysql.scalar(
      "SELECT 1 FROM mdt_reports_warrants WHERE citizenid = ? AND expirydate >= NOW() LIMIT 1",
      [citizenid],
    )) !== null,
};
