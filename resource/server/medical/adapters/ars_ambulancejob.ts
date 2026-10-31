import { PlayerState, stateBoolean } from "@aicore-fivem/lib/server";
import type { MedicalAdapter } from "@aicore-fivem/shared";

/** ars_ambulancejob: its `dead` player state and its `healPlayer` client event. */
const dead = new PlayerState("dead", stateBoolean);
const isDead = (source: number) => dead.get(source) === true;

export const arsAmbulance: MedicalAdapter = {
  resource: "ars_ambulancejob",
  revive: (source) => {
    const was = isDead(source);
    emitNet("ars_ambulancejob:healPlayer", source, { revive: true });
    return was;
  },
  heal: (source) =>
    emitNet("ars_ambulancejob:healPlayer", source, { heal: true }),
  isDead,
};
