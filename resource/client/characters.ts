import { createLogger, isRecord, waitFor } from "@aicore-fivem/lib/shared";
import {
  loadLocaleTexts,
  onServerEvent,
  triggerServerCallback,
} from "@aicore-fivem/lib/client";
import {
  CORE,
  type CharacterActionResult,
  type CharacterScreen,
  type SpawnPoint,
} from "@aicore-fivem/shared";
import { NuiCallback, NuiMessage } from "common/nui";
import { ResourceName } from "common";
import { SelectScene, setPlayerModel, waitForGround } from "./scene";
import { announceLoaded } from "./playerState";

const log = createLogger("ai-core");
const scene = new SelectScene();
const BUSY: CharacterActionResult = { ok: false, error: "CHAR_ERR_BUSY" };

let screen: CharacterScreen | null = null;
/** Portraits an appearance resource made for the cards, by character id; kept until a character spawns. */
let portraits: Record<number, string> = {};
/** Whether the in-world scene stands behind the screen (false: the NUI shows its background picture). */
let sceneLive = false;

/** Answers of the server are unknown: this is the only shape the screen accepts. */
function toResult(value: unknown): CharacterActionResult {
  if (isRecord(value) && value.ok === true) return { ok: true };
  if (isRecord(value) && typeof value.error === "string")
    return { ok: false, error: value.error };
  return BUSY;
}

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

type NuiReply = (value: unknown) => void;

RegisterNuiCallback(NuiCallback.ready, (_data: unknown, cb: NuiReply) =>
  cb(screen ? openPayload(screen) : null),
);

RegisterNuiCallback(NuiCallback.focus, (id: unknown, cb: NuiReply) => {
  if (typeof id === "number") scene.focus(id);
  cb(true);
});

on(CORE.clientCharacterLookEvent, (id: unknown) => {
  if (typeof id === "number") scene.dress(id);
});

on("onResourceStop", (resource: string) => {
  if (resource === ResourceName) scene.leave();
});

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
/** The spawn point the server sends: finite coordinates and a model name. */
function toSpawn(value: unknown): [SpawnPoint] | null {
  if (!isRecord(value) || typeof value.model !== "string") return null;
  const { x, y, z, heading } = value;
  const finite = (n: unknown): n is number =>
    typeof n === "number" && Number.isFinite(n);
  return finite(x) && finite(y) && finite(z) && finite(heading)
    ? [{ x, y, z, heading, model: value.model }]
    : null;
}

onServerEvent(
  CORE.spawnEvent,
  { args: ([raw]) => toSpawn(raw) },
  async (spawn) => {
    try {
      DoScreenFadeOut(300);
      await waitFor(() => IsScreenFadedOut() || undefined, 2000).catch(
        () => undefined,
      );
      closeCharacters();
      scene.leave();
      await setPlayerModel(spawn.model);
      RequestCollisionAtCoord(spawn.x, spawn.y, spawn.z);
      NetworkResurrectLocalPlayer(
        spawn.x,
        spawn.y,
        spawn.z,
        spawn.heading,
        0,
        false,
      );
      const ped = PlayerPedId();
      SetEntityCoordsNoOffset(
        ped,
        spawn.x,
        spawn.y,
        spawn.z,
        false,
        false,
        false,
      );
      SetEntityHeading(ped, spawn.heading);
      await waitForGround();
      FreezeEntityPosition(ped, false);
      SetEntityInvincible(ped, false);
      SetEntityVisible(ped, true, false);
      DisplayRadar(true);
      DoScreenFadeIn(500);
      screen = null;
      portraits = {};
      announceLoaded();
    } catch (error) {
      log.error("spawn failed", error);
      DoScreenFadeIn(0);
    }
  },
);

onServerEvent(CORE.openCharactersEvent, () => {
  openCharacters().catch((error: unknown) =>
    log.error("opening the character screen failed", error),
  );
});
