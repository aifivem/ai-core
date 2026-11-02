import { mysql } from "@aifivem/mysql";
import type { MdtAdapter } from "@aifivem/shared";

/**
 * tgiann-mdt (written from its source: sql.sql, server/server.lua): no exports and no records from scripts (its
 * screen opens from its client event, `client/mdt`). Its wanted list is the table `tgiann_mdt_arananlar`: a row per
 * wanted citizenid, deleted when an officer removes it or its timer ends it, so a row is an active warrant, the same
 * list its own screen shows (read only).
 */
export const tgiannMdt: MdtAdapter = {
  resource: "tgiann-mdt",
  hasWarrant: async (citizenid) =>
    (await mysql.scalar(
      "SELECT 1 FROM tgiann_mdt_arananlar WHERE citizenid = ? LIMIT 1",
      [citizenid],
    )) !== null,
};
