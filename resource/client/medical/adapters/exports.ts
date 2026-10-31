import { callExport } from "@aicore-fivem/lib/client";
import type { MedicalClientAdapter } from "@aicore-fivem/shared";

/** A death script that answers "down" through a client export and fires local events when the player goes down or up. */
function exportAdapter(
  resource: string,
  exportName: string,
  events: readonly string[],
): MedicalClientAdapter {
  return {
    resource,
    isDead: () => callExport(resource, exportName) === true,
    watch: (changed) => {
      // They fire the event before storing the new state: read it on the next tick.
      for (const event of events) on(event, () => setTimeout(changed, 0));
    },
  };
}

/** osp_ambulance: `isDead()` (dead or last stand). */
export const ospAmbulance = exportAdapter("osp_ambulance", "isDead", [
  "osp_ambulance:OnPlayerDead",
  "osp_ambulance:OnPlayerSpawn",
]);
/** brutal_ambulancejob: `IsDead()`. */
export const brutalAmbulance = exportAdapter("brutal_ambulancejob", "IsDead", [
  "brutal_ambulancejob:client:onPlayerDeath",
  "brutal_ambulancejob:revive",
]);
