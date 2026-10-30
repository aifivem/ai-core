import { onServerEvent } from "@aicore-fivem/lib/client";
import { createLogger, waitFor } from "@aicore-fivem/lib/shared";
import { CORE } from "@aicore-fivem/shared";
import "./keybinds";
import "./admin";
import "./cacheWatch";
import "./prompts";
import "./notify";
import "./menu";
import "./inventory";
import { openCharacters } from "./characters";
import { announceUnloaded } from "./playerState";

const log = createLogger("ai-core");

/** No spawnmanager: ai-core takes the player from the loading screen to the character screen itself. */
async function boot(): Promise<void> {
  await waitFor(() => NetworkIsSessionStarted() || undefined, false);
  await openCharacters();
}

onServerEvent(CORE.openCharactersEvent, () => announceUnloaded());

boot().catch((error: unknown) => log.error("boot failed", error));
