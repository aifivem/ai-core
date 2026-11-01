import { fadeIn, fadeOut } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import {
  CORE,
  type CharacterAppearance,
  type CharacterCard,
  type CharacterScene,
  type SceneSpot,
} from "@aicore-fivem/shared";
import { applyLook, sameModel } from "../appearance";
import { hudHidden } from "../hud";
import {
  FREEMODE,
  hidePlayer,
  setPlayerModel,
  waitForGround,
} from "./playerPed";
import { SceneCamera } from "./sceneCamera";
import { createScenePed } from "./scenePed";
import { SceneTime } from "./sceneTime";

/** HUDs and the minimap stay hidden from the character screen until the spawn fade lifts. */
export const SCREEN_HUD_REASON = "characters";

const log = createLogger("ai-core");

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
  private readonly time = new SceneTime();

  /** Builds the scene behind a black screen, focused on the first character, then fades in. */
  async enter(
    scene: CharacterScene,
    characters: CharacterCard[],
  ): Promise<void> {
    await fadeOut(0);
    this.leave();
    this.scene = scene;
    this.characters = characters;
    this.focused = characters[0]?.id ?? null;
    try {
      const spot = this.focusSpot(scene);
      if (!spot) throw new Error("the character scene has no spots");
      await setPlayerModel(FREEMODE.male);
      hidePlayer(spot);
      this.time.force(scene.time);
      this.camera.frame(spot, scene.fov, true);
      await waitForGround();
      await this.sync();
    } finally {
      ShutdownLoadingScreen();
      ShutdownLoadingScreenNui();
      hudHidden.set(SCREEN_HUD_REASON, true, CORE.resource);
      void fadeIn(500);
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
    this.time.restore();
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
      const ped = await createScenePed(
        this.looks.get(id)?.model ?? FREEMODE[card.sex],
        spot,
      );
      if (generation !== this.generation) return DeletePed(ped);
      this.peds.set(id, { ped, spot: index });
      this.dress(id);
    }
  }
}
