import { CORE } from "@aicore-fivem/shared";
import { players } from "./registry";

/** The player whose ped this is: a player always owns its own ped, so the owner is checked instead of scanning 10k players. */
function sourceOfPed(ped: number): number | null {
  if (ped === 0 || !DoesEntityExist(ped)) return null;
  const owner = NetworkGetEntityOwner(ped);
  return owner > 0 &&
    players.get(owner) !== undefined &&
    GetPlayerPed(String(owner)) === ped
    ? owner
    : null;
}

// FXServer reports ped deaths from the synced health itself (38039+, required in ai-core's manifest): no client
// watches its own health.
on("onPedDeath", (ped: number, attacker: number, weaponHash: number) => {
  const source = sourceOfPed(ped);
  if (source === null) return;
  emit(CORE.playerDiedEvent, source, sourceOfPed(attacker), weaponHash);
});
