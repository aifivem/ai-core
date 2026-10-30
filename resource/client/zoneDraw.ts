import { TickLoop } from "@aicore-fivem/lib/client";
import { isRecord } from "@aicore-fivem/lib/shared";
import { NuiCallback } from "common/nui";

type NuiReply = (value: unknown) => void;

/** Corners a zone may have on screen at once (the widget caps lower). */
const MAX_CORNERS = 64;

/**
 * The polygon of the panel's zone widget drawn in the world while the field is on screen (also behind the free
 * camera while corners are picked): bottom and top edges, a post at each corner. Flat arrays, nothing allocated per
 * frame.
 */
class ZoneDraw {
  /** [x, y, low, high] per corner. */
  private corners: number[] = [];
  private readonly frame = new TickLoop(() => this.draw());

  set(points: Array<{ x: number; y: number; z: number }>, height: number) {
    this.corners = [];
    for (const p of points.slice(0, MAX_CORNERS))
      this.corners.push(p.x, p.y, p.z - height, p.z + height);
    this.frame.set(this.corners.length > 0);
  }

  private draw(): void {
    const c = this.corners;
    const n = c.length / 4;
    for (let i = 0; i < n; i++) {
      const a = i * 4;
      const b = ((i + 1) % n) * 4;
      const ax = c[a] ?? 0;
      const ay = c[a + 1] ?? 0;
      const al = c[a + 2] ?? 0;
      const ah = c[a + 3] ?? 0;
      DrawLine(ax, ay, al, ax, ay, ah, 64, 222, 128, 230);
      if (n < 2) continue;
      const bx = c[b] ?? 0;
      const by = c[b + 1] ?? 0;
      DrawLine(ax, ay, al, bx, by, c[b + 2] ?? 0, 64, 222, 128, 230);
      DrawLine(ax, ay, ah, bx, by, c[b + 3] ?? 0, 64, 222, 128, 230);
    }
  }
}

const zone = new ZoneDraw();

const toPoint = (v: unknown) =>
  isRecord(v) &&
  typeof v.x === "number" &&
  typeof v.y === "number" &&
  typeof v.z === "number" &&
  Number.isFinite(v.x + v.y + v.z)
    ? { x: v.x, y: v.y, z: v.z }
    : null;

RegisterNuiCallback(
  NuiCallback.adminZoneDraw,
  (data: unknown, cb: NuiReply) => {
    if (!isRecord(data) || !Array.isArray(data.points)) zone.set([], 0);
    else {
      const height =
        typeof data.height === "number" && Number.isFinite(data.height)
          ? Math.min(Math.max(data.height, 0), 1000)
          : 2;
      zone.set(
        data.points.flatMap((p) => toPoint(p) ?? []),
        height,
      );
    }
    cb(true);
  },
);
