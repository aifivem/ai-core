import { fetchNui } from "fivem-nui-react";
import { NuiCallback } from "../../../../resource/common/nui";
import { store } from "../../store";
import { picking } from "../../store/admin";

/** The admin panel's world tools: the admin's position, teleport, free camera picks, place names and zone drawing. */

export interface Point {
  x: number;
  y: number;
  z: number;
  heading: number;
}

/** Draws a zone widget's corners in the world (null stops drawing). */
export function drawZone(
  zone: {
    points: Array<{ x: number; y: number; z: number }>;
    height: number;
  } | null,
): void {
  void fetchNui<boolean>(NuiCallback.adminZoneDraw, zone, { mockData: true });
}

export async function myPosition(
  from: "ped" | "camera",
  ground = false,
): Promise<Point | null> {
  const answer = await fetchNui<unknown>(
    NuiCallback.adminPosition,
    { from, ground },
    { mockData: { x: 215.76, y: -810.12, z: 30.73, heading: 157.5 } },
  ).catch(() => null);
  if (typeof answer !== "object" || answer === null) return null;
  const p = answer as Record<string, unknown>;
  return typeof p.x === "number" &&
    typeof p.y === "number" &&
    typeof p.z === "number" &&
    typeof p.heading === "number"
    ? { x: p.x, y: p.y, z: p.z, heading: p.heading }
    : null;
}

/** Teleports the admin; `ground` puts the feet on the point (floor points, doors) instead of the body's centre. */
export function teleport(
  point: { x: number; y: number; z: number; heading?: number },
  ground: boolean,
): void {
  void fetchNui<boolean>(
    NuiCallback.adminTeleport,
    { ...point, ground },
    { mockData: true },
  );
}

/** Picks a place with the free camera; the panel hides until the admin places or cancels. */
export async function pickPoint(root: boolean): Promise<Point | null> {
  store.dispatch(picking(true));
  const answer = await fetchNui<unknown>(
    NuiCallback.adminPickPoint,
    { root },
    {
      mockData: { x: 228.41, y: -795.3, z: 30.62, heading: 90 },
      mockDelay: 800,
    },
  ).catch(() => null);
  store.dispatch(picking(false));
  if (typeof answer !== "object" || answer === null) return null;
  const p = answer as Record<string, unknown>;
  return typeof p.x === "number" &&
    typeof p.y === "number" &&
    typeof p.z === "number" &&
    typeof p.heading === "number"
    ? { x: p.x, y: p.y, z: p.z, heading: p.heading }
    : null;
}

/** A world object picked with the free camera: its model name and position (null: cancelled). */
export async function pickEntity(): Promise<{
  model: string;
  x: number;
  y: number;
  z: number;
} | null> {
  store.dispatch(picking(true));
  const answer = await fetchNui<unknown>(NuiCallback.adminPickEntity, null, {
    mockData: { model: "v_ilev_ph_door01", x: 434.75, y: -980.62, z: 30.84 },
    mockDelay: 800,
  }).catch(() => null);
  store.dispatch(picking(false));
  if (typeof answer !== "object" || answer === null) return null;
  const e = answer as Record<string, unknown>;
  return typeof e.model === "string" &&
    typeof e.x === "number" &&
    typeof e.y === "number" &&
    typeof e.z === "number"
    ? { model: e.model, x: e.x, y: e.y, z: e.z }
    : null;
}

/** Street and zone names at a place (or at the admin) for a name field's suggestions. */
export async function placeNames(at: Point | null): Promise<string[]> {
  const answer = await fetchNui<unknown>(NuiCallback.adminPlaceNames, at, {
    mockData: ["Alta St", "Pillbox Hill", "Alta St, Pillbox Hill"],
  }).catch(() => []);
  return Array.isArray(answer)
    ? answer.filter((v): v is string => typeof v === "string").slice(0, 6)
    : [];
}
