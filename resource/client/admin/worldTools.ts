import { cache, locationName, player } from "@aicore-fivem/lib/client";
import { isRecord, round as roundTo } from "@aicore-fivem/lib/shared";
import { NuiCallback } from "common/nui";
import { pickEntity, pickPoint } from "./picks";
import { panel } from "./panel";

/** The panel's world tools: the admin's position, teleport, free camera picks and place names. */

type NuiReply = (value: unknown) => void;
const round = (value: number): number => roundTo(value, 2);

/** Street and zone names at a place, for name suggestions ("Alta St", "Pillbox Hill", "Alta St, Pillbox Hill"). */
function placeNames(x: number, y: number, z: number): string[] {
  const { street, crossing, zone } = locationName({ x, y, z });
  const names = [
    street,
    zone,
    street && zone ? `${street}, ${zone}` : "",
    street && crossing ? `${street} & ${crossing}` : "",
  ];
  return [...new Set(names.filter(Boolean))];
}

RegisterNuiCallback(
  NuiCallback.adminPosition,
  (data: unknown, cb: NuiReply) => {
    const camera = isRecord(data) && data.from === "camera";
    const ground = isRecord(data) && data.ground === true;
    const ped = cache.ped;
    const [x = 0, y = 0, root = 0] = camera
      ? GetFinalRenderedCamCoord()
      : GetEntityCoords(ped, false);
    const z = ground && !camera ? root - GetEntityHeightAboveGround(ped) : root;
    const heading = camera
      ? (GetFinalRenderedCamRot(2)[2] ?? 0)
      : GetEntityHeading(ped);
    cb({
      x: round(x),
      y: round(y),
      z: round(z),
      heading: round(((heading % 360) + 360) % 360),
    });
  },
);

RegisterNuiCallback(
  NuiCallback.adminTeleport,
  (data: unknown, cb: NuiReply) => {
    if (
      isRecord(data) &&
      typeof data.x === "number" &&
      typeof data.y === "number" &&
      typeof data.z === "number"
    )
      // A floor point (door, ground spot) is where the feet go; the others are the body's centre.
      void player.teleport(
        { x: data.x, y: data.y, z: data.z },
        {
          ground: data.ground === true,
          heading: typeof data.heading === "number" ? data.heading : undefined,
        },
      );
    cb(true);
  },
);

// Free camera pick: the NUI hides the panel and gives the focus back to the game until a place is picked or cancelled.
RegisterNuiCallback(
  NuiCallback.adminPickPoint,
  (data: unknown, cb: NuiReply) => {
    if (!panel.isOpen) return cb(null);
    SetNuiFocus(false, false);
    void pickPoint(isRecord(data) && data.root === true).then((point) => {
      if (panel.isOpen) SetNuiFocus(true, true);
      cb(point);
    });
  },
);

RegisterNuiCallback(
  NuiCallback.adminPickEntity,
  (_data: unknown, cb: NuiReply) => {
    if (!panel.isOpen) return cb(null);
    SetNuiFocus(false, false);
    void pickEntity().then((entity) => {
      if (panel.isOpen) SetNuiFocus(true, true);
      cb(entity);
    });
  },
);

RegisterNuiCallback(
  NuiCallback.adminPlaceNames,
  (data: unknown, cb: NuiReply) => {
    const at =
      isRecord(data) &&
      typeof data.x === "number" &&
      typeof data.y === "number" &&
      typeof data.z === "number"
        ? data
        : null;
    const [x = 0, y = 0, z = 0] = at
      ? [at.x as number, at.y as number, at.z as number]
      : GetEntityCoords(cache.ped, false);
    cb(placeNames(x, y, z));
  },
);
