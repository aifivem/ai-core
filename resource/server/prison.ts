import { callExport, registerExport } from "@aicore-fivem/lib/server";
import { AdapterPicker } from "common/adapters";
import { log } from "./log";
import { players } from "./player/registry";

/** One prison script's answers; ai-core's prison layer (lib `prison`) forwards to the first running one. */
interface PrisonAdapter {
  readonly resource: string;
  jail(source: number, minutes: number, by: number): boolean;
  release(source: number): boolean;
  timeLeft(source: number): number;
}

const AI = "ai-prison";
const aiPrison: PrisonAdapter = {
  resource: AI,
  jail: (source, minutes, by) =>
    callExport(AI, "JailPlayer", source, minutes, by) === true,
  release: (source) => callExport(AI, "ReleasePlayer", source) === true,
  timeLeft: (source) => Number(callExport(AI, "GetJailTime", source)) || 0,
};

/** qb-prison keeps the sentence in QB's `injail` metadata and runs its client from these events. */
const qbPrison: PrisonAdapter = {
  resource: "qb-prison",
  jail: (source, minutes) => {
    const player = players.get(source);
    if (!player) return false;
    player.setMeta("injail", minutes);
    emitNet("prison:client:Enter", source, minutes);
    return true;
  },
  release: (source) => {
    const player = players.get(source);
    if (!player) return false;
    player.setMeta("injail", 0);
    emitNet("prison:client:UnjailPerson", source);
    return true;
  },
  timeLeft: (source) => Number(players.get(source)?.getMeta("injail")) || 0,
};

const prison = new AdapterPicker<PrisonAdapter>({
  category: "prison",
  adapters: [aiPrison, qbPrison],
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
