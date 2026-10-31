import { PlayerState, stateBoolean } from "@aicore-fivem/lib/server";
import { isRecord } from "@aicore-fivem/lib/shared";
import type { MedicalAdapter } from "@aicore-fivem/shared";

/**
 * osp_ambulance: down = its `BodyDamage` player state (`isDead` / `inLastStand`) or the `isDead` state its server sets
 * when it mutes a downed player. Its QB revive client event `hospital:client:Revive (true)` revives without its
 * "unsurvivable" check and restores health on a player who is up (its txAdmin heal does the same).
 */
const body = new PlayerState("BodyDamage", (v) =>
  isRecord(v) ? v.isDead === true || v.inLastStand === true : undefined,
);
const muted = new PlayerState("isDead", stateBoolean);
const isDead = (source: number) =>
  body.get(source) === true || muted.get(source) === true;

export const ospAmbulance: MedicalAdapter = {
  resource: "osp_ambulance",
  version: "2.0.5",
  revive: (source) => {
    const was = isDead(source);
    emitNet("hospital:client:Revive", source, true);
    return was;
  },
  heal: (source) => {
    if (!isDead(source)) emitNet("hospital:client:Revive", source, true);
  },
  isDead,
};
