import { PlayerState, stateBoolean } from "@aicore-fivem/lib/server";
import type { MedicalAdapter } from "@aicore-fivem/shared";

/** esx_ambulancejob: ESX's `isDead` player state and the ambulance job's revive / heal client events. */
const dead = new PlayerState("isDead", stateBoolean);
const isDead = (source: number) => dead.get(source) === true;

export const esxAmbulance: MedicalAdapter = {
  resource: "esx_ambulancejob",
  revive: (source) => {
    const was = isDead(source);
    emitNet("esx_ambulancejob:revive", source);
    return was;
  },
  heal: (source) => emitNet("esx_ambulancejob:heal", source, "big", true),
  isDead,
};
