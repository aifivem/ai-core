import { callExport, PlayerState } from "@aicore-fivem/lib/server";
import type { MedicalAdapter } from "@aicore-fivem/shared";

/**
 * wasabi_ambulance (v1): its `dead` player state (`"dead"` / `"laststand"`, false when up) and server export
 * `RevivePlayer(id)`. It has no server heal export (only client ones), so heal does nothing.
 */
const dead = new PlayerState("dead", (v) =>
  v === "dead" || v === "laststand" ? true : v === false ? false : undefined,
);
const isDead = (source: number) => dead.get(source) === true;

export const wasabiAmbulance: MedicalAdapter = {
  resource: "wasabi_ambulance",
  revive: (source) => {
    const was = isDead(source);
    callExport("wasabi_ambulance", "RevivePlayer", source);
    return was;
  },
  heal: () => undefined,
  isDead,
};
