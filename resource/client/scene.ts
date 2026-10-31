import { requestAnimDict, requestModel } from "@aicore-fivem/lib/client";
import { createLogger, waitFor } from "@aicore-fivem/lib/shared";
import {
  CORE,
  type CharacterAppearance,
  type CharacterCard,
  type CharacterScene,
  type SceneSpot,
  type Sex,
} from "@aicore-fivem/shared";
import { applyLook, sameModel } from "./appearance";
import { SceneCamera } from "./sceneCamera";
import { worldSync } from "./world";
import { hudHidden } from "./hud";

/** HUDs and the minimap stay hidden from the character screen until the spawn fade lifts. */
export const SCREEN_HUD_REASON = "characters";

const log = createLogger("ai-core");
const MODELS: Record<Sex, string> = {
  male: "mp_m_freemode_01",
  female: "mp_f_freemode_01",
};
/** The weather sync pause contract (qb-weathersync's client events, answered by ai-weathersync). */

/** Swaps the player's model (freemode by sex) and resets its clothing to the defaults. */
export async function setPlayerModel(model: string): Promise<void> {
  const hash = await requestModel(model);
  if (GetEntityModel(PlayerPedId()) !== hash) {
    SetPlayerModel(PlayerId(), hash);
    SetPedDefaultComponentVariation(PlayerPedId());
  }
  SetModelAsNoLongerNeeded(hash);
}

/** Waits (at most a few seconds) for the map around the ped to load, so it does not fall through. */
export async function waitForGround(): Promise<void> {
  await waitFor(
    () => HasCollisionLoadedAroundEntity(PlayerPedId()) || undefined,
    5000,
  ).catch(() => undefined);
}

/**
 * The world behind the character screen: the player's characters stand on the scene's spots as local peds in their
 * saved look (appearance layer, when a clothing script runs), the camera frames the picked one. The player itself waits hidden.
 */
export class SelectScene {
  private scene: CharacterScene | null = null;
  private characters: CharacterCard[] = [];
  private focused: number | null = null;
  /** Character id -> its ped and the spot index it stands on. */
  private readonly peds = new Map<number, { ped: number; spot: number }>();
  /** Looks of the cards by character id; they may arrive before the scene and stay until a character spawns. */
  private readonly looks = new Map<number, CharacterAppearance>();
  private readonly camera = new SceneCamera();
  private queue: Promise<void> = Promise.resolve();
  /** Raised by `leave`: ped creation still loading for an older scene drops its ped. */
  private generation = 0;
  private timeForced = false;

  /** Builds the scene behind a black screen, focused on the first character, then fades in. */
  async enter(
    scene: CharacterScene,
    characters: CharacterCard[],
  ): Promise<void> {
    DoScreenFadeOut(0);
    this.leave();
    this.scene = scene;
    this.characters = characters;
    this.focused = characters[0]?.id ?? null;
    try {
      const spot = this.focusSpot(scene);
      if (!spot) throw new Error("the character scene has no spots");
      await setPlayerModel(MODELS.male);
      this.hidePlayer(spot);
      this.forceTime(scene.time);
      this.camera.frame(spot, scene.fov, true);
      await waitForGround();
      await this.sync();
    } finally {
      ShutdownLoadingScreen();
      ShutdownLoadingScreenNui();
      hudHidden.set(SCREEN_HUD_REASON, true, CORE.resource);
      DoScreenFadeIn(500);
    }
  }

  /** The list changed (a character was deleted): focus the first one and bring the peds in line. */
  async setCharacters(characters: CharacterCard[]): Promise<void> {
    const scene = this.scene;
    if (!scene) return;
    this.characters = characters;
    this.focused = characters[0]?.id ?? null;
    const spot = this.focusSpot(scene);
    if (spot) this.camera.frame(spot, scene.fov, false);
    await this.sync();
  }

  /** The player picked another character: the camera glides to it (a character without its own spot steps in first). */
  focus(id: number): void {
    const scene = this.scene;
    if (
      !scene ||
      id === this.focused ||
      !this.characters.some((c) => c.id === id)
    )
      return;
    this.focused = id;
    void this.sync();
    const spot = this.focusSpot(scene);
    if (spot) this.camera.frame(spot, scene.fov, false);
  }

  /** A card's look arrived (possibly after its ped): dress the ped. */
  setLook(id: number, look: CharacterAppearance): void {
    this.looks.set(id, look);
    this.dress(id);
  }

  /** Forgets the card looks (a character spawned). */
  clearLooks(): void {
    this.looks.clear();
  }

  /** Puts a character's look on its ped; a ped of another model (a non-freemode look) is made again with the look's. */
  private dress(id: number): void {
    const entry = this.peds.get(id);
    const look = this.looks.get(id);
    if (!entry || !look) return;
    if (sameModel(GetEntityModel(entry.ped), look.model)) {
      applyLook(entry.ped, look);
      return;
    }
    DeletePed(entry.ped);
    this.peds.delete(id);
    void this.sync();
  }

  /** Deletes the peds, drops the camera and gives time and weather back to the sync. */
  leave(): void {
    this.generation++;
    for (const { ped } of this.peds.values()) DeletePed(ped);
    this.peds.clear();
    this.camera.destroy();
    this.restoreTime();
    this.scene = null;
    this.characters = [];
    this.focused = null;
  }

  /** Spot index per shown character: slot N stands on spot N; a picked character past the spots borrows spot (slot - 1) % count. */
  private placement(count: number): Map<number, number> {
    const out = new Map<number, number>();
    const picked = this.characters.find((c) => c.id === this.focused);
    const borrowed =
      picked && picked.slot > count ? (picked.slot - 1) % count : -1;
    for (const c of this.characters)
      if (c.slot <= count && c.slot - 1 !== borrowed) out.set(c.id, c.slot - 1);
    if (picked && borrowed >= 0) out.set(picked.id, borrowed);
    return out;
  }

  private focusSpot(scene: CharacterScene): SceneSpot | undefined {
    const index =
      this.focused === null
        ? 0
        : (this.placement(scene.spots.length).get(this.focused) ?? 0);
    return scene.spots[index];
  }

  /** Serialized, so overlapping calls never create a character's ped twice. */
  private sync(): Promise<void> {
    const generation = this.generation;
    this.queue = this.queue
      .then(() => this.syncNow(generation))
      .catch((error: unknown) =>
        log.error("character scene peds failed", error),
      );
    return this.queue;
  }

  private async syncNow(generation: number): Promise<void> {
    const scene = this.scene;
    if (!scene || generation !== this.generation) return;
    const placement = this.placement(scene.spots.length);
    for (const [id, entry] of this.peds) {
      if (placement.get(id) === entry.spot) continue;
      DeletePed(entry.ped);
      this.peds.delete(id);
    }
    for (const [id, index] of placement) {
      const card = this.characters.find((c) => c.id === id);
      const spot = scene.spots[index];
      if (this.peds.has(id) || !card || !spot) continue;
      const ped = await this.createPed(
        this.looks.get(id)?.model ?? MODELS[card.sex],
        spot,
      );
      if (generation !== this.generation) return DeletePed(ped);
      this.peds.set(id, { ped, spot: index });
      this.dress(id);
    }
  }

  /** A local (not networked) frozen ped on the spot, default clothes, playing the spot's idle. */
  private async createPed(
    model: string | number,
    spot: SceneSpot,
  ): Promise<number> {
    const hash = await requestModel(model);
    const { x, y, z, heading } = spot.ped;
    const ped = CreatePed(4, hash, x, y, z, heading, false, false);
    SetModelAsNoLongerNeeded(hash);
    SetEntityCoordsNoOffset(ped, x, y, z, false, false, false);
    FreezeEntityPosition(ped, true);
    SetEntityInvincible(ped, true);
    SetBlockingOfNonTemporaryEvents(ped, true);
    SetPedDefaultComponentVariation(ped);
    if (spot.anim && spot.clip) {
      const loaded = await requestAnimDict(spot.anim).then(
        () => true,
        (error: unknown) => (
          log.warn(`scene animation ${spot.anim} did not load`, error),
          false
        ),
      );
      if (loaded) {
        TaskPlayAnim(
          ped,
          spot.anim,
          spot.clip,
          8,
          8,
          -1,
          1,
          0,
          false,
          false,
          false,
        );
        RemoveAnimDict(spot.anim);
      }
    }
    return ped;
  }

  /** The player waits invisible and frozen under the focused spot, so the area's collision and map stream in. */
  private hidePlayer(spot: SceneSpot): void {
    const { x, y, heading } = spot.ped;
    const z = spot.ped.z - 5;
    RequestCollisionAtCoord(x, y, z);
    NetworkResurrectLocalPlayer(x, y, z, heading, 0, false);
    const ped = PlayerPedId();
    SetEntityCoordsNoOffset(ped, x, y, z, false, false, false);
    FreezeEntityPosition(ped, true);
    SetEntityInvincible(ped, true);
    SetEntityVisible(ped, false, false);
  }

  private forceTime(time: CharacterScene["time"]): void {
    if (!time.enabled) return;
    worldSync.reasons.set("scene", true, CORE.resource);
    NetworkOverrideClockTime(time.hour, time.minute, 0);
    SetOverrideWeather(time.weather);
    this.timeForced = true;
  }

  private restoreTime(): void {
    if (!this.timeForced) return;
    this.timeForced = false;
    ClearOverrideWeather();
    NetworkClearClockTimeOverride();
    worldSync.reasons.set("scene", false, CORE.resource);
  }
}
