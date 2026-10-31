import { registerExport } from "@aicore-fivem/lib/server";
import { AdapterPicker } from "common/adapters";
import { log } from "../log";
import type { PrisonAdapter } from "./adapter";
import { aiPrison } from "./adapters/ai-prison";
import { qbPrison } from "./adapters/qb-prison";
import { rcorePrison } from "./adapters/rcore_prison";
import { tgiannPolicejob } from "./adapters/tgiann-policejob";
import { xtPrison } from "./adapters/xt-prison";

/**
 * Every supported prison script in detection order: the first running one answers. tgiann-policejob is last: it is a
 * police job that may run next to a separate prison script. A new prison script = one adapter file and one line here.
 */
export const PRISONS: readonly PrisonAdapter[] = [
  aiPrison,
  qbPrison,
  rcorePrison,
  xtPrison,
  tgiannPolicejob,
];

const prison = new AdapterPicker<PrisonAdapter>({
  category: "prison",
  adapters: PRISONS,
  log,
  noneText: "no prison script runs: jail calls answer false",
});

registerExport(
  "JailPlayer",
  (source: unknown, minutes: unknown, by?: unknown) =>
    typeof source === "number" &&
    typeof minutes === "number" &&
    minutes > 0 &&
    prison.call(
      "JailPlayer",
      (a) => a.jail(source, minutes, typeof by === "number" ? by : 0),
      false,
    ),
);
registerExport(
  "ReleasePlayer",
  (source: unknown) =>
    typeof source === "number" &&
    prison.call("ReleasePlayer", (a) => a.release(source), false),
);
registerExport("GetJailTime", (source: unknown) =>
  typeof source === "number"
    ? prison.call("GetJailTime", (a) => a.timeLeft(source), 0)
    : 0,
);
