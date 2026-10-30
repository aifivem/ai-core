import { CORE, PED_DEATH_STATE_KEY, PED_EVENTS_MIN_BUILD } from "@aicore-fivem/shared";
import { log } from "../log";
import { players } from "./registry";

/** The FXServer build number from the `version` convar ("FXServer-master SERVER v1.0.0.38039 win32"). */
const build = Number(/v1\.0\.0\.(\d+)/.exec(GetConvar("version", ""))?.[1] ?? 0);
const supported = build >= PED_EVENTS_MIN_BUILD;

/** The player whose ped this is (deaths are rare, a scan of the online players is enough). */
function sourceOfPed(ped: number): number | null {
  if (ped === 0) return null;
  for (const player of players.all()) if (GetPlayerPed(String(player.source)) === ped) return player.source;
  return null;
}

// FXServer reports ped deaths from the synced health itself: no client needs to watch its own health. Older builds
// leave the key false and death resources keep their client check.
GlobalState.set(PED_DEATH_STATE_KEY, supported, true);
if (supported) {
  on("onPedDeath", (ped: number, attacker: number, weaponHash: number) => {
    const source = sourceOfPed(ped);
    if (source === null) return;
    emit(CORE.playerDiedEvent, source, sourceOfPed(attacker), weaponHash);
  });
} else log.info(`FXServer ${build} has no onPedDeath (${PED_EVENTS_MIN_BUILD}+): death resources watch health on the client`);
