import { callExport, PlayerState, stateNumber } from "@aicore-fivem/lib/server";
import type { MedicalAdapter } from "@aicore-fivem/shared";

/**
 * wasabi_ambulance_v2: its `wasabi:deathState` player state (0 alive, 1 last stand, 2 dead; the key is its default,
 * the owner can rename it in its config) and server exports `RevivePlayer(id)` / `ApplyHeal(id, options)`.
 */
const V2 = "wasabi_ambulance_v2";
const deathState = new PlayerState("wasabi:deathState", stateNumber);
const isDead = (source: number) => (deathState.get(source) ?? 0) >= 1;

export const wasabiAmbulanceV2: MedicalAdapter = {
  resource: V2,
  revive: (source) => {
    const was = isDead(source);
    callExport(V2, "RevivePlayer", source);
    return was;
  },
  heal: (source) =>
    void callExport(V2, "ApplyHeal", source, {
      health: 200,
      injuries: "all",
      limbHealth: 100,
    }),
  isDead,
};
