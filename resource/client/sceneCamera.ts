import { every, ScriptCamera, type Job } from "@aicore-fivem/lib/client";
import type { Vec3 } from "@aicore-fivem/lib/shared";
import type { SceneSpot } from "@aicore-fivem/shared";

const MOVE_MS = 500;
const SWAY_MS = 10_000;
const SHAKE = 0.15;
const RAD = Math.PI / 180;

/** Camera position for a spot seen from `heading` (degrees): in front of that heading, raised by the height slope. */
function cameraAt(spot: SceneSpot, heading: number): Vec3 {
  const pitch = Math.atan(spot.camHeight);
  const flat = spot.camDistance * Math.cos(pitch);
  return {
    x: spot.ped.x - Math.sin(heading * RAD) * flat,
    y: spot.ped.y + Math.cos(heading * RAD) * flat,
    z: spot.ped.z + spot.targetHeight + spot.camDistance * Math.sin(pitch),
  };
}

/**
 * The character screen camera: frames one spot, glides to another when the pick changes, sways slowly, and blurs
 * the background when the spot asks for it.
 */
export class SceneCamera {
  private readonly camera = new ScriptCamera();
  private sway: ReturnType<typeof setTimeout> | null = null;
  private swayJob: Job | null = null;

  /** Frames `spot` at once (`instant`) or with a short glide from the current shot. */
  frame(spot: SceneSpot, fov: number, instant: boolean): void {
    const base = spot.ped.heading + spot.camAngle;
    const at = cameraAt(spot, base);
    const target = {
      x: spot.ped.x,
      y: spot.ped.y,
      z: spot.ped.z + spot.targetHeight,
    };
    const blur = spot.blur
      ? {
          near: spot.blurNear,
          far: spot.blurFar,
          strength: spot.blurStrength / 100,
        }
      : null;
    if (instant || !this.camera.active) {
      this.camera.start(at, { pointAt: target, fov });
      this.camera.shake("HAND_SHAKE", SHAKE);
      this.camera.blur(blur);
    } else {
      this.camera.blur(blur);
      this.camera.glideTo(at, { pointAt: target, fov }, MOVE_MS);
    }
    SetFocusPosAndVel(at.x, at.y, at.z, 0, 0, 0);
    this.startSway(spot, fov, base, instant ? 0 : MOVE_MS);
  }

  /** Swings the camera between base ± sway, one side per SWAY_MS (the game interpolates each leg). */
  private startSway(
    spot: SceneSpot,
    fov: number,
    base: number,
    delay: number,
  ): void {
    this.stopSway();
    if (spot.sway <= 0) return;
    let side = 1;
    const leg = (): void => {
      if (!this.camera.active) return;
      const at = cameraAt(spot, base + side * spot.sway);
      this.camera.move(at, { fov }, SWAY_MS);
      SetFocusPosAndVel(at.x, at.y, at.z, 0, 0, 0);
      side = -side;
    };
    this.sway = setTimeout(() => {
      this.sway = null;
      leg();
      this.swayJob = every(SWAY_MS, leg, { name: "sceneSway" });
    }, delay);
  }

  private stopSway(): void {
    if (this.sway !== null) clearTimeout(this.sway);
    this.sway = null;
    this.swayJob?.stop();
    this.swayJob = null;
  }

  destroy(): void {
    this.stopSway();
    if (!this.camera.active) return;
    this.camera.stop();
    ClearFocus();
  }
}
