import { callExport } from "@aicore-fivem/lib/server";
import type { PrisonAdapter } from "../adapter";

/**
 * tgiann-policejob's jail: server exports `SendToJail(id, minutes, reason?, officerId?)` (adds to a running sentence),
 * `ReleaseFromJail(id)` and `IsPlayerJailed(id)` (Lua's `true, minutes` arrives as an array, else `false`).
 */
const TP = "tgiann-policejob";

export const tgiannPolicejob: PrisonAdapter = {
  resource: TP,
  besideOurs: true,
  version: "1.7.0",
  jail: (source, minutes, by) => {
    callExport(TP, "SendToJail", source, minutes, null, by > 0 ? by : null);
    return true;
  },
  // Answers a promise when it waits on its database: anything but false is done.
  release: (source) => callExport(TP, "ReleaseFromJail", source) !== false,
  timeLeft: (source) => {
    const jailed = callExport(TP, "IsPlayerJailed", source);
    return Array.isArray(jailed) && typeof jailed[1] === "number"
      ? jailed[1]
      : 0;
  },
};
