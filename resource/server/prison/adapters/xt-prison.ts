import { isOnline, PlayerState, stateNumber } from "@aicore-fivem/lib/server";
import type { PrisonAdapter } from "../adapter";

/**
 * xt-prison: the sentence is its `jailTime` player state; it still answers qb-prison's client events (it prints a
 * "deprecated event" line per call), which start and end the sentence through its own client.
 */
const jailTime = new PlayerState("jailTime", stateNumber);
const timeLeft = (source: number) => jailTime.get(source) ?? 0;

export const xtPrison: PrisonAdapter = {
  resource: "xt-prison",
  version: "1.4.8",
  jail: (source, minutes) => {
    if (!isOnline(source)) return false;
    emitNet("prison:client:Enter", source, minutes);
    return true;
  },
  release: (source) => {
    if (timeLeft(source) <= 0) return false;
    emitNet("prison:client:UnjailPerson", source);
    return true;
  },
  timeLeft,
};
