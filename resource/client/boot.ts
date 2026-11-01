import { onServerEvent } from "@aicore-fivem/lib/client";
import { createLogger, waitFor } from "@aicore-fivem/lib/shared";
import { CORE, NUI_LAYER } from "@aicore-fivem/shared";
import { openCharacters } from "./characters";
import { externalScreen } from "./multichar";
import { announceUnloaded } from "./playerState";

// Stacking among NUI pages (`NUI_LAYER`): set at start, not left to load order.
SetNuiZindex(NUI_LAYER.screen);

const log = createLogger("ai-core");

/** No spawnmanager: ai-core takes the player from the loading screen to the character screen itself, unless an external one runs. */
async function boot(): Promise<void> {
  await waitFor(() => NetworkIsSessionStarted() || undefined, false);
  if (externalScreen()) return;
  await openCharacters();
}

onServerEvent(CORE.openCharactersEvent, () => announceUnloaded());

boot().catch((error: unknown) => log.error("boot failed", error));
