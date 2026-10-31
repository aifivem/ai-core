import {
  callExport,
  PlayerState,
  stateBoolean,
} from "@aicore-fivem/lib/server";
import type { MedicalAdapter } from "@aicore-fivem/shared";

/**
 * tgiann-ambulance: its server sets the `isDead` player state (down or dead) and exports
 * `SetPlayerAlive(source, { isAdmin, healBodyDamage })`, the call its `/revive` command makes. On a player who is up it
 * restores health and clears body damage, so heal uses it too.
 */
const dead = new PlayerState("isDead", stateBoolean);
const isDead = (source: number) => dead.get(source) === true;
const setAlive = (source: number) =>
  callExport("tgiann-ambulance", "SetPlayerAlive", source, {
    isAdmin: true,
    healBodyDamage: true,
  });

export const tgiannAmbulance: MedicalAdapter = {
  resource: "tgiann-ambulance",
  revive: (source) => {
    const was = isDead(source);
    setAlive(source);
    return was;
  },
  heal: (source) => {
    if (!isDead(source)) setAlive(source);
  },
  isDead,
};
