import {
  getPlayerData,
  onPlayerData,
  registerExport,
} from "@aicore-fivem/lib/client";
import { CORE, type AiPlayerData } from "@aicore-fivem/shared";

/**
 * The player's own data on this client, as ai-core pushed it (snapshot at load, then deltas). Other client
 * resources read it once with the `GetPlayerData` export and follow `onPlayerData` from the lib afterwards.
 */
let loaded = false;

function snapshot(): AiPlayerData | null {
  const character = getPlayerData("character");
  if (!loaded || !character) return null;
  return {
    character,
    money: getPlayerData("money") ?? {},
    jobs: getPlayerData("jobs") ?? [],
    duty: getPlayerData("duty") ?? null,
    job: getPlayerData("job") ?? { job: "unemployed", grade: 0 },
    gangs: getPlayerData("gangs") ?? [],
    activeGang: getPlayerData("activeGang") ?? null,
    metadata: getPlayerData("metadata") ?? {},
  };
}

/** Whether a character stands in the world on this client. */
export const isLoaded = (): boolean => loaded;

/** Called once the character stands in the world: client scripts (and the bridges) start from here. */
export function announceLoaded(): void {
  loaded = true;
  emit(CORE.clientPlayerLoadedEvent, snapshot());
}

/** The character was let go (switch): client scripts drop their per-character state. */
export function announceUnloaded(): void {
  if (!loaded) return;
  loaded = false;
  emit(CORE.clientPlayerUnloadedEvent);
}

// Subscribing starts the lib's listener before the server's snapshot can arrive.
onPlayerData("character", () => undefined);

registerExport("GetPlayerData", () => snapshot());
registerExport("IsPlayerLoaded", () => loaded);
