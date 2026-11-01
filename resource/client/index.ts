import { onServerEvent } from "@aicore-fivem/lib/client";
import { createLogger, waitFor } from "@aicore-fivem/lib/shared";
import { CORE, NUI_LAYER } from "@aicore-fivem/shared";
import "./definitions";
import "./keybinds";
import "./keyHints";
import "./admin";
import "./adminBans";
import "./adminPlayers";
import "./zoneDraw";
import "./cacheWatch";
import "./menu";
import "./itemPicker";
import "./keyboard";
import "./inventory";
import "./vehicleKeys";
import "./vehicles";
import "./hud";
import "./gestures";
import "./seatbelt";
import "./stress";
import "./notify";
import "./appearance";
import "./radial";
import "./world";
import "./pvp";
import "./medical";
import "./mdt";
import "./bills";
import "./fuel";
import "./garages";
import "./setup";
import "./spawnChoice";
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
