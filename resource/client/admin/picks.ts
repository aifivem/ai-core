import { round as roundTo } from "@aicore-fivem/lib/shared";
import { direction, freeFly } from "./freecam";

/** The free camera picks of the panel's point and entity widgets. */

/** A picked place: the floor (or the ped's root height above it) and a heading. */
export interface PickedPoint {
  x: number;
  y: number;
  z: number;
  heading: number;
}

const round = (n: number) => roundTo(n, 2);

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
