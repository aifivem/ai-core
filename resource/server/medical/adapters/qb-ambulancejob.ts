import type { MedicalAdapter } from "@aicore-fivem/shared";
import { players } from "../../player/registry";

/** qb-ambulancejob: QB's `isdead` / `inlaststand` metadata (ai-core keeps it) and its client revive / heal events. */
const isDead = (source: number) => {
  const player = players.get(source);
  return (
    player?.getMeta("isdead") === true ||
    player?.getMeta("inlaststand") === true
  );
};

export const qbAmbulance: MedicalAdapter = {
  resource: "qb-ambulancejob",
  revive: (source) => {
    const was = isDead(source);
    emitNet("hospital:client:Revive", source);
    return was;
  },
  heal: (source) => emitNet("hospital:client:HealInjuries", source, "full"),
  isDead,
};
