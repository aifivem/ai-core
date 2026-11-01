import { requestAnimDict, requestModel } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import type { SceneSpot } from "@aicore-fivem/shared";

const log = createLogger("ai-core");

/** A local (not networked) frozen ped on the spot, default clothes, playing the spot's idle. */
export async function createScenePed(
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
