import { callExport, isOnline } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { PrisonAdapter } from "../adapter";

/**
 * rcore_prison server exports `Jail(id, minutes, reason?, officerId?)`, `Unjail(id)`, `IsPrisoner(id)` and
 * `GetPrisonerData(id)` (`jail_time` in minutes).
 */
const RC = "rcore_prison";

export const rcorePrison: PrisonAdapter = {
  resource: RC,
  jail: (source, minutes, by) => {
    if (!isOnline(source)) return false;
    callExport(RC, "Jail", source, minutes, null, by > 0 ? by : null);
    return true;
  },
  release: (source) => {
    if (callExport(RC, "IsPrisoner", source) !== true) return false;
    callExport(RC, "Unjail", source);
    return true;
  },
  timeLeft: (source) => {
    const data = callExport(RC, "GetPrisonerData", source);
    return isRecord(data) ? Number(data.jail_time) || 0 : 0;
  },
};
