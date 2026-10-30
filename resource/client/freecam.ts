import { cache, raycast, TickLoop } from "@aicore-fivem/lib/client";

/** A picked place: the floor (or the ped's root height above it) and a heading. */
export interface PickedPoint {
  x: number;
  y: number;
  z: number;
  heading: number;
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
} as const;
const RANGE = 150;
const round = (n: number) => Math.round(n * 100) / 100;

/** Unit direction of a camera rotation (degrees, rotation order 2). */
function direction(pitch: number, yaw: number): [number, number, number] {
  const p = (pitch * Math.PI) / 180;
  const y = (yaw * Math.PI) / 180;
  return [-Math.sin(y) * Math.cos(p), Math.cos(y) * Math.cos(p), Math.sin(p)];
}

interface Aim {
  hit: { x: number; y: number; z: number } | null;
  entity: number;
  heading: number;
}

/**
 * A free camera for picking something in the world (the admin panel's point and entity widgets): WASD and Q/E fly,
 * the mouse looks, the scroll wheel turns the heading, Enter takes what the centre of the screen hits, Backspace
 * cancels. `frame` draws the current aim, `pick` turns it into the answer (null keeps flying).
 */
function freeFly<T>(
  flags: number,
  frame: (aim: Aim) => void,
  pick: (aim: Aim) => T | null,
): Promise<T | null> {
  return new Promise((resolve) => {
    const [cx = 0, cy = 0, cz = 0] = GetGameplayCamCoord();
    const [rx = 0, , rz = 0] = GetGameplayCamRot(2);
    const pos = { x: cx, y: cy, z: cz + 1 };
    const rot = { pitch: rx, yaw: rz };
    const aim: Aim = {
      hit: null,
      entity: 0,
      heading: ((rz % 360) + 360) % 360,
    };
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
      2,
    );
    RenderScriptCams(true, false, 0, true, true);
    FreezeEntityPosition(cache.ped, true);

    const finish = (answer: T | null) => {
      loop.set(false);
      RenderScriptCams(false, false, 0, true, true);
      DestroyCam(cam, false);
      ClearFocus();
      FreezeEntityPosition(cache.ped, false);
      resolve(answer);
    };

    const loop = new TickLoop(() => {
      DisableAllControlActions(0);
      rot.yaw -= GetDisabledControlNormal(0, C.lookX) * 6;
      rot.pitch = Math.max(
        -89,
        Math.min(89, rot.pitch - GetDisabledControlNormal(0, C.lookY) * 6),
      );
      const speed = IsDisabledControlPressed(0, C.fast)
        ? 1.2
        : IsDisabledControlPressed(0, C.slow)
          ? 0.05
          : 0.3;
      const [fx, fy, fz] = direction(rot.pitch, rot.yaw);
      const [sx, sy] = direction(0, rot.yaw - 90);
      const forward =
        (IsDisabledControlPressed(0, C.w) ? 1 : 0) -
        (IsDisabledControlPressed(0, C.s) ? 1 : 0);
      const side =
        (IsDisabledControlPressed(0, C.d) ? 1 : 0) -
        (IsDisabledControlPressed(0, C.a) ? 1 : 0);
      const lift =
        (IsDisabledControlPressed(0, C.up) ? 1 : 0) -
        (IsDisabledControlPressed(0, C.down) ? 1 : 0);
      pos.x += (fx * forward + sx * side) * speed;
      pos.y += (fy * forward + sy * side) * speed;
      pos.z += (fz * forward + lift) * speed;
      SetCamCoord(cam, pos.x, pos.y, pos.z);
      SetCamRot(cam, rot.pitch, 0, rot.yaw, 2);
      SetFocusPosAndVel(pos.x, pos.y, pos.z, 0, 0, 0);
      if (IsDisabledControlJustPressed(0, C.wheelUp))
        aim.heading = (aim.heading + 15) % 360;
      if (IsDisabledControlJustPressed(0, C.wheelDown))
        aim.heading = (aim.heading + 345) % 360;

      const hit = raycast(
        pos,
        {
          x: pos.x + fx * RANGE,
          y: pos.y + fy * RANGE,
          z: pos.z + fz * RANGE,
        },
        { flags, options: 4 },
      );
      aim.hit = hit?.coords ?? null;
      aim.entity = hit?.entity ?? 0;
      frame(aim);
      if (IsDisabledControlJustPressed(0, C.cancel)) finish(null);
      else if (IsDisabledControlJustPressed(0, C.confirm)) {
        const answer = pick(aim);
        if (answer !== null) finish(answer);
      }
    });
    loop.set(true);
  });
}

/** A place in the world (point widgets). `root`: the ped's root height (about 1 m above the floor) instead of the floor. */
export function pickPoint(root: boolean): Promise<PickedPoint | null> {
  return freeFly(
    1 | 16,
    ({ hit, heading }) => {
      if (!hit) return;
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
        false,
      );
      const [hx, hy] = direction(0, heading);
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
        255,
      );
    },
    ({ hit, heading }) =>
      hit
        ? {
            x: round(hit.x),
            y: round(hit.y),
            z: round(root ? hit.z + 1 : hit.z),
            heading: round(heading),
          }
        : null,
  );
}

/** A world object (doors, props): its model name and position (entity widgets). */
export interface PickedEntity {
  model: string;
  x: number;
  y: number;
  z: number;
}

export function pickEntity(): Promise<PickedEntity | null> {
  let outlined = 0;
  const outline = (entity: number) => {
    if (entity === outlined) return;
    if (outlined) SetEntityDrawOutline(outlined, false);
    outlined = entity;
    if (entity) {
      SetEntityDrawOutlineColor(54, 255, 159, 255);
      SetEntityDrawOutline(entity, true);
    }
  };
  return freeFly(
    16,
    ({ entity }) => outline(entity && GetEntityType(entity) === 3 ? entity : 0),
    ({ entity }) => {
      if (!entity || GetEntityType(entity) !== 3) return null;
      const [x = 0, y = 0, z = 0] = GetEntityCoords(entity, false);
      const name = GetEntityArchetypeName(entity);
      return {
        model: name || String(GetEntityModel(entity) >>> 0),
        x: round(x),
        y: round(y),
        z: round(z),
      };
    },
  ).finally(() => outline(0));
}

/** Street and zone names at a place, for name suggestions ("Alta St", "Pillbox Hill", "Alta St, Pillbox Hill"). */
export function placeNames(x: number, y: number, z: number): string[] {
  const [streetHash = 0, crossingHash = 0] = GetStreetNameAtCoord(x, y, z);
  const street = streetHash ? GetStreetNameFromHashKey(streetHash) : "";
  const crossing = crossingHash ? GetStreetNameFromHashKey(crossingHash) : "";
  const zoneLabel = GetLabelText(GetNameOfZone(x, y, z));
  const zone = zoneLabel && zoneLabel !== "NULL" ? zoneLabel : "";
  const names = [
    street,
    zone,
    street && zone ? `${street}, ${zone}` : "",
    street && crossing ? `${street} & ${crossing}` : "",
  ];
  return [...new Set(names.filter(Boolean))];
}
