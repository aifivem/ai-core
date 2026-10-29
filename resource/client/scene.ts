import { requestModel } from "@aicore-fivem/lib/client";
import { waitFor } from "@aicore-fivem/lib/shared";
import type { ScenePoint, Sex } from "@aicore-fivem/shared";

const MODELS: Record<Sex, string> = { male: "mp_m_freemode_01", female: "mp_f_freemode_01" };

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
async function waitForGround(): Promise<void> {
  await waitFor(() => HasCollisionLoadedAroundEntity(PlayerPedId()) || undefined, 5000).catch(() => undefined);
}

/**
 * The character screen's world part: the player's own ped stands at the scene point (in a private bucket the
 * server set) with a scripted camera on it; the NUI draws on top.
 */
export class SelectScene {
  private camera: number | null = null;
  private sex: Sex | null = null;

  async enter(ped: ScenePoint, camera: ScenePoint, fov: number): Promise<void> {
    DoScreenFadeOut(0);
    await this.preview("male");
    const self = PlayerPedId();
    RequestCollisionAtCoord(ped.x, ped.y, ped.z);
    NetworkResurrectLocalPlayer(ped.x, ped.y, ped.z, ped.heading, 0, false);
    SetEntityCoordsNoOffset(PlayerPedId(), ped.x, ped.y, ped.z, false, false, false);
    SetEntityHeading(PlayerPedId(), ped.heading);
    FreezeEntityPosition(self, true);
    SetEntityInvincible(PlayerPedId(), true);
    await waitForGround();

    if (this.camera === null) {
      this.camera = CreateCamWithParams("DEFAULT_SCRIPTED_CAMERA", camera.x, camera.y, camera.z, 0, 0, camera.heading, fov, false, 0);
    }
    PointCamAtCoord(this.camera, ped.x, ped.y, ped.z + 0.3);
    SetCamActive(this.camera, true);
    RenderScriptCams(true, false, 0, true, true);
    DisplayRadar(false);

    ShutdownLoadingScreen();
    ShutdownLoadingScreenNui();
    DoScreenFadeIn(500);
  }

  /** Shows a ped of `sex` (a character's look comes later from the appearance integration). */
  async preview(sex: Sex): Promise<void> {
    if (this.sex === sex) return;
    this.sex = sex;
    await setPlayerModel(MODELS[sex]);
    FreezeEntityPosition(PlayerPedId(), true);
    SetEntityInvincible(PlayerPedId(), true);
  }

  leave(): void {
    if (this.camera !== null) {
      RenderScriptCams(false, false, 0, true, true);
      DestroyCam(this.camera, false);
      this.camera = null;
    }
    this.sex = null;
  }
}

export { waitForGround };
