import {
  cache,
  controls,
  raycast,
  ScriptCamera,
  TickLoop,
} from "@aicore-fivem/lib/client";

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

/** Unit direction of a camera rotation (degrees, rotation order 2). */
export function direction(
  pitch: number,
  yaw: number,
): [number, number, number] {
  const p = (pitch * Math.PI) / 180;
  const y = (yaw * Math.PI) / 180;
  return [-Math.sin(y) * Math.cos(p), Math.cos(y) * Math.cos(p), Math.sin(p)];
}

export interface Aim {
  hit: { x: number; y: number; z: number } | null;
  entity: number;
  heading: number;
}

/**
 * A free camera for picking something in the world (the admin panel's point and entity widgets): WASD and Q/E fly,
 * the mouse looks, the scroll wheel turns the heading, Enter takes what the centre of the screen hits, Backspace
 * cancels. `frame` draws the current aim, `pick` turns it into the answer (null keeps flying).
 */
export function freeFly<T>(
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
    // One object reused every frame (`move` reads it), not a new one per frame.
    const view = { rotation: { x: rot.pitch, y: 0, z: rot.yaw } };
    const cam = new ScriptCamera();
    cam.start(pos, { ...view, fov: 60 });
    FreezeEntityPosition(cache.ped, true);
    // Every control off while flying; the loop reads the disabled ones.
    controls.disableAll("freecam");

    const finish = (answer: T | null) => {
      loop.set(false);
      controls.enable("freecam");
      cam.stop();
      ClearFocus();
      FreezeEntityPosition(cache.ped, false);
      resolve(answer);
    };

    const loop = new TickLoop(() => {
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
      view.rotation.x = rot.pitch;
      view.rotation.z = rot.yaw;
      cam.move(pos, view);
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
