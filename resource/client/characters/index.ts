import { createLogger, isRecord } from "@aicore-fivem/lib/shared";
import {
  fadeIn,
  fadeOut,
  loadLocaleTexts,
  onServerEvent,
  onStop,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import { CORE, type CharacterScreen } from "@aicore-fivem/shared";
import { NuiCallback, NuiMessage } from "common/nui";
import { hudHidden } from "../hud";
import { announceLoaded } from "../playerState";
import { BUSY, toLooks, toResult, toSpawn } from "./parse";
import { placePlayer } from "./playerPed";
import { SCREEN_HUD_REASON, SelectScene } from "./scene";

const log = createLogger("ai-core");
const scene = new SelectScene();

let screen: CharacterScreen | null = null;
/** Portraits an appearance resource made for the cards, by character id; kept until a character spawns. */
let portraits: Record<number, string> = {};
/** Whether the in-world scene stands behind the screen (false: the NUI shows its background picture). */
let sceneLive = false;

async function loadScreen(): Promise<CharacterScreen | null> {
  const answer = await triggerServerCallback(CORE.charactersCallback).catch(
    () => null,
  );
  // ai-core builds this object itself; the NUI only renders it.
  screen =
    isRecord(answer) &&
    Array.isArray(answer.characters) &&
    isRecord(answer.scene) &&
    Array.isArray(answer.scene.spots)
      ? (answer as unknown as CharacterScreen)
      : null;
  return screen;
}

const openPayload = (data: CharacterScreen) => ({
  screen: data,
  texts: loadLocaleTexts(),
  portraits,
  scene: sceneLive,
});

/** Puts the player on the character screen: scene with the characters, camera, NUI with focus. */
export async function openCharacters(): Promise<void> {
  const data = await loadScreen();
  if (!data) return;
  sceneLive = await scene.enter(data.scene, data.characters).then(
    () => true,
    (error: unknown) => {
      log.error("building the character scene failed", error);
      scene.leave();
      return false;
    },
  );
  SetNuiFocus(true, true);
  SendNUIMessage({
    action: NuiMessage.openCharacters,
    data: openPayload(data),
  });
}

function closeCharacters(): void {
  SetNuiFocus(false, false);
  SendNUIMessage({ action: NuiMessage.closeCharacters });
}

/** An external character screen took over: ai-core's goes away without a spawn (its scene, NUI and HUD reason). */
export function dropCharacters(): void {
  if (!screen) return;
  closeCharacters();
  scene.leave();
  hudHidden.set(SCREEN_HUD_REASON, false, CORE.resource);
  screen = null;
}

type NuiReply = (value: unknown) => void;

RegisterNuiCallback(NuiCallback.ready, (_data: unknown, cb: NuiReply) =>
  cb(screen ? openPayload(screen) : null),
);

RegisterNuiCallback(NuiCallback.focus, (id: unknown, cb: NuiReply) => {
  if (typeof id === "number") scene.focus(id);
  cb(true);
});

onServerEvent(
  CORE.characterLooksEvent,
  { args: ([raw]) => toLooks(raw) },
  (looks) => {
    for (const { id, look } of looks) scene.setLook(id, look);
  },
);

onStop(() => scene.leave());

on(CORE.clientCharacterPortraitEvent, (id: unknown, url: unknown) => {
  if (
    typeof id !== "number" ||
    typeof url !== "string" ||
    !url.startsWith("https://nui-img/")
  )
    return;
  portraits[id] = url;
  SendNUIMessage({ action: NuiMessage.portrait, data: { id, url } });
});

function serverAction(callback: string) {
  return (data: unknown, cb: NuiReply): void => {
    triggerServerCallback(callback, [data]).then(
      (answer) => cb(toResult(answer)),
      () => cb(BUSY),
    );
  };
}

RegisterNuiCallback(
  NuiCallback.create,
  serverAction(CORE.createCharacterCallback),
);
RegisterNuiCallback(
  NuiCallback.select,
  serverAction(CORE.selectCharacterCallback),
);
RegisterNuiCallback(NuiCallback.remove, (data: unknown, cb: NuiReply) => {
  triggerServerCallback(CORE.deleteCharacterCallback, [data]).then(
    async (answer) => {
      const result = toResult(answer);
      if (!result.ok) return cb(result);
      const next = await loadScreen();
      if (next) await scene.setCharacters(next.characters);
      cb({ ok: true, screen: next });
    },
    () => cb(BUSY),
  );
});

/** The server loaded a character: out of the screen and into the world at its spawn. */
onServerEvent(
  CORE.spawnEvent,
  { args: ([raw]) => toSpawn(raw) },
  async (spawn) => {
    try {
      // The screen is gone (CSS opacity, 200 ms) well before the game is black, then closes.
      SendNUIMessage({ action: NuiMessage.leaveCharacters });
      await fadeOut(500);
      closeCharacters();
      scene.leave();
      await placePlayer(spawn);
      hudHidden.set(SCREEN_HUD_REASON, false, CORE.resource);
      void fadeIn(500);
      screen = null;
      portraits = {};
      scene.clearLooks();
      announceLoaded();
    } catch (error) {
      log.error("spawn failed", error);
      void fadeIn(0);
    }
  },
);

onServerEvent(CORE.openCharactersEvent, () => {
  openCharacters().catch((error: unknown) =>
    log.error("opening the character screen failed", error),
  );
});
