import { callExport } from "@aicore-fivem/lib/server";
import type { MdtAdapter } from "@aicore-fivem/shared";

const RESOURCE = "lb-tablet";

/**
 * LB Tablet's police MDT (written from its docs, docs.lbscripts.com/tablet/script-integration/server-exports): jail
 * records through `LogMDTJailed(mdt, prisoner, jailedBy?, reason, jailTime)` (seconds) on the `police` MDT, with
 * citizen ids. Its other records (reports) need tab ids the docs leave to each server, so only jail records are
 * written. Its screen is the tablet item (no open export).
 */
export const lbTablet: MdtAdapter = {
  resource: RESOURCE,
  record: (e) => {
    if (e.kind !== "jail" || e.minutes === undefined) return false;
    const answer: unknown = callExport(
      RESOURCE,
      "LogMDTJailed",
      "police",
      e.targetCitizenid,
      e.byCitizenid,
      e.title,
      e.minutes * 60,
    );
    return answer instanceof Promise || (answer !== false && answer != null);
  },
};
