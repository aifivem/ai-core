import { players } from "../../player/registry";
import type { PrisonAdapter } from "../adapter";

/** qb-prison keeps the sentence in QB's `injail` metadata and runs its client from these events. */
export const qbPrison: PrisonAdapter = {
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
