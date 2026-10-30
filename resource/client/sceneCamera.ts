import type { SceneSpot } from "@aicore-fivem/shared"

const MOVE_MS = 500
const SWAY_MS = 10_000
const SHAKE = 0.15
const RAD = Math.PI / 180

/** Camera position for a spot seen from `heading` (degrees): in front of that heading, raised by the height slope. */
function cameraAt(spot: SceneSpot, heading: number): [number, number, number] {
  const pitch = Math.atan(spot.camHeight)
  const flat = spot.camDistance * Math.cos(pitch)
  return [
    spot.ped.x - Math.sin(heading * RAD) * flat,
    spot.ped.y + Math.cos(heading * RAD) * flat,
    spot.ped.z + spot.targetHeight + spot.camDistance * Math.sin(pitch),
  ]
}

/**
 * The character screen camera: frames one spot, glides to another when the pick changes, sways slowly, and blurs
 * the background when the spot asks for it. Each move is a new camera interpolated from the old one.
 */
export class SceneCamera {
  private camera: number | null = null
  /** Cameras still interpolating away; destroyed after the move or on `destroy`. */
  private readonly retired = new Set<number>()
  private sway: ReturnType<typeof setTimeout> | null = null
  private dofTick: number | null = null

  /** Frames `spot` at once (`instant`) or with a short glide from the current shot. */
  frame(spot: SceneSpot, fov: number, instant: boolean): void {
    const base = spot.ped.heading + spot.camAngle
    const [x, y, z] = cameraAt(spot, base)
    const cam = CreateCamWithParams(
      "DEFAULT_SCRIPTED_CAMERA",
      x,
      y,
      z,
      0,
      0,
      0,
      fov,
      false,
      2
    )
    PointCamAtCoord(cam, spot.ped.x, spot.ped.y, spot.ped.z + spot.targetHeight)
    ShakeCam(cam, "HAND_SHAKE", SHAKE)
    this.blur(cam, spot)
    const old = this.camera
    this.camera = cam
    if (old === null || instant) {
      if (old !== null) DestroyCam(old, false)
      SetCamActive(cam, true)
      RenderScriptCams(true, false, 0, true, true)
    } else {
      SetCamActiveWithInterp(cam, old, MOVE_MS, 1, 1)
      this.retired.add(old)
      setTimeout(() => {
        if (this.retired.delete(old)) DestroyCam(old, false)
      }, MOVE_MS + 150)
    }
    SetFocusPosAndVel(x, y, z, 0, 0, 0)
    this.startSway(spot, fov, base, instant ? 0 : MOVE_MS)
  }

  /** Swings the camera between base ± sway, one side per SWAY_MS (the game interpolates each leg). */
  private startSway(
    spot: SceneSpot,
    fov: number,
    base: number,
    delay: number
  ): void {
    this.stopSway()
    if (spot.sway <= 0) return
    let side = 1
    const leg = (): void => {
      if (this.camera === null) return
      const [x, y, z] = cameraAt(spot, base + side * spot.sway)
      SetCamParams(this.camera, x, y, z, 0, 0, 0, fov, SWAY_MS, 0, 0, 2)
      SetFocusPosAndVel(x, y, z, 0, 0, 0)
      side = -side
      this.sway = setTimeout(leg, SWAY_MS)
    }
    this.sway = setTimeout(leg, delay)
  }

  private stopSway(): void {
    if (this.sway !== null) clearTimeout(this.sway)
    this.sway = null
  }

  /** Depth of field needs `SetUseHiDof` every frame, so the tick runs only while a blurred spot is framed. */
  private blur(cam: number, spot: SceneSpot): void {
    SetCamUseShallowDofMode(cam, spot.blur)
    if (spot.blur) {
      SetCamNearDof(cam, spot.blurNear)
      SetCamFarDof(cam, spot.blurFar)
      SetCamDofStrength(cam, spot.blurStrength / 100)
      this.dofTick ??= setTick(() => SetUseHiDof())
    } else if (this.dofTick !== null) {
      clearTick(this.dofTick)
      this.dofTick = null
    }
  }

  destroy(): void {
    this.stopSway()
    if (this.dofTick !== null) clearTick(this.dofTick)
    this.dofTick = null
    if (this.camera === null) return
    RenderScriptCams(false, false, 0, true, true)
    DestroyCam(this.camera, false)
    for (const cam of this.retired) DestroyCam(cam, false)
    this.retired.clear()
    this.camera = null
    ClearFocus()
  }
}
