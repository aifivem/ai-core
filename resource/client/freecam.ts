import { cache } from "@aicore-fivem/lib/client"

/** A picked place: the floor (or the ped's root height above it) and a heading. */
export interface PickedPoint {
  x: number
  y: number
  z: number
  heading: number
}

// Controls (disabled while the camera flies, read with the Disabled* natives).
const C = {
  lookX: 1,
  lookY: 2,
  w: 32,
  s: 33,
  a: 34,
  d: 35,
  down: 44,
  up: 38,
  fast: 21,
  slow: 36,
  wheelUp: 241,
  wheelDown: 242,
  confirm: 191,
  cancel: 194,
} as const
const RANGE = 150
const round = (n: number) => Math.round(n * 100) / 100

/** Unit direction of a camera rotation (degrees, rotation order 2). */
function direction(pitch: number, yaw: number): [number, number, number] {
  const p = (pitch * Math.PI) / 180
  const y = (yaw * Math.PI) / 180
  return [-Math.sin(y) * Math.cos(p), Math.cos(y) * Math.cos(p), Math.sin(p)]
}

/**
 * Picks a point in the world with a free camera (the admin panel's point widgets): WASD and Q/E fly, the mouse
 * looks, the scroll wheel turns the heading, Enter places at what the centre of the screen hits, Backspace cancels.
 * `root`: return the ped's root height (about 1 m above the floor) instead of the floor.
 */
export function pickPoint(root: boolean): Promise<PickedPoint | null> {
  return new Promise((resolve) => {
    const [cx = 0, cy = 0, cz = 0] = GetGameplayCamCoord()
    const [rx = 0, , rz = 0] = GetGameplayCamRot(2)
    const pos = { x: cx, y: cy, z: cz + 1 }
    const rot = { pitch: rx, yaw: rz }
    let heading = ((rz % 360) + 360) % 360
    let hit: { x: number; y: number; z: number } | null = null
    const cam = CreateCamWithParams(
      "DEFAULT_SCRIPTED_CAMERA",
      pos.x,
      pos.y,
      pos.z,
      rot.pitch,
      0,
      rot.yaw,
      60,
      true,
      2
    )
    RenderScriptCams(true, false, 0, true, true)
    FreezeEntityPosition(cache.ped, true)

    const finish = (point: PickedPoint | null) => {
      clearTick(tick)
      RenderScriptCams(false, false, 0, true, true)
      DestroyCam(cam, false)
      ClearFocus()
      FreezeEntityPosition(cache.ped, false)
      resolve(point)
    }

    const tick = setTick(() => {
      DisableAllControlActions(0)
      rot.yaw -= GetDisabledControlNormal(0, C.lookX) * 6
      rot.pitch = Math.max(
        -89,
        Math.min(89, rot.pitch - GetDisabledControlNormal(0, C.lookY) * 6)
      )
      const speed = IsDisabledControlPressed(0, C.fast)
        ? 1.2
        : IsDisabledControlPressed(0, C.slow)
          ? 0.05
          : 0.3
      const [fx, fy, fz] = direction(rot.pitch, rot.yaw)
      const [sx, sy] = direction(0, rot.yaw - 90)
      const forward =
        (IsDisabledControlPressed(0, C.w) ? 1 : 0) -
        (IsDisabledControlPressed(0, C.s) ? 1 : 0)
      const side =
        (IsDisabledControlPressed(0, C.d) ? 1 : 0) -
        (IsDisabledControlPressed(0, C.a) ? 1 : 0)
      const lift =
        (IsDisabledControlPressed(0, C.up) ? 1 : 0) -
        (IsDisabledControlPressed(0, C.down) ? 1 : 0)
      pos.x += (fx * forward + sx * side) * speed
      pos.y += (fy * forward + sy * side) * speed
      pos.z += (fz * forward + lift) * speed
      SetCamCoord(cam, pos.x, pos.y, pos.z)
      SetCamRot(cam, rot.pitch, 0, rot.yaw, 2)
      SetFocusPosAndVel(pos.x, pos.y, pos.z, 0, 0, 0)
      if (IsDisabledControlJustPressed(0, C.wheelUp))
        heading = (heading + 15) % 360
      if (IsDisabledControlJustPressed(0, C.wheelDown))
        heading = (heading + 345) % 360

      const probe = StartExpensiveSynchronousShapeTestLosProbe(
        pos.x,
        pos.y,
        pos.z,
        pos.x + fx * RANGE,
        pos.y + fy * RANGE,
        pos.z + fz * RANGE,
        1 | 16,
        cache.ped,
        4
      )
      const [, didHit, end] = GetShapeTestResult(probe)
      hit = didHit ? { x: end[0] ?? 0, y: end[1] ?? 0, z: end[2] ?? 0 } : null
      if (hit) {
        DrawMarker(
          25,
          hit.x,
          hit.y,
          hit.z + 0.02,
          0,
          0,
          0,
          0,
          0,
          0,
          0.8,
          0.8,
          0.8,
          54,
          255,
          159,
          180,
          false,
          false,
          2,
          false,
          "",
          "",
          false
        )
        const [hx, hy] = direction(0, heading)
        DrawLine(
          hit.x,
          hit.y,
          hit.z + 0.05,
          hit.x + hx * 1.2,
          hit.y + hy * 1.2,
          hit.z + 0.05,
          54,
          255,
          159,
          255
        )
      }
      if (IsDisabledControlJustPressed(0, C.cancel)) finish(null)
      else if (IsDisabledControlJustPressed(0, C.confirm) && hit)
        finish({
          x: round(hit.x),
          y: round(hit.y),
          z: round(root ? hit.z + 1 : hit.z),
          heading: round(heading),
        })
    })
  })
}

/** Street and zone names at a place, for name suggestions ("Alta St", "Pillbox Hill", "Alta St, Pillbox Hill"). */
export function placeNames(x: number, y: number, z: number): string[] {
  const [streetHash = 0, crossingHash = 0] = GetStreetNameAtCoord(x, y, z)
  const street = streetHash ? GetStreetNameFromHashKey(streetHash) : ""
  const crossing = crossingHash ? GetStreetNameFromHashKey(crossingHash) : ""
  const zoneLabel = GetLabelText(GetNameOfZone(x, y, z))
  const zone = zoneLabel && zoneLabel !== "NULL" ? zoneLabel : ""
  const names = [
    street,
    zone,
    street && zone ? `${street}, ${zone}` : "",
    street && crossing ? `${street} & ${crossing}` : "",
  ]
  return [...new Set(names.filter(Boolean))]
}
