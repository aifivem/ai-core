import { coordsOf, registerExport } from "@aicore-fivem/lib/server";
import {
  cellKey,
  flatDistance,
  gridCell,
  type Vec3,
} from "@aicore-fivem/lib/shared";

/**
 * Who is in whose OneSync scope (~424 m), from `playerEnteredScope` / `playerLeftScope`. These events cost per player
 * in scope, so only ai-core listens; every resource asks `GetPlayersInScope` (lib `playersNear`). Players already in
 * scope when ai-core starts are found once from a scope-sized grid.
 */
const SCOPE_RADIUS = 424;

class Scopes {
  private readonly scopes = new Map<number, Set<number>>();

  private link(a: number, b: number): void {
    let set = this.scopes.get(a);
    if (!set) this.scopes.set(a, (set = new Set()));
    set.add(b);
  }

  start(): void {
    on("playerEnteredScope", (data: { for: string; player: string }) =>
      this.link(Number(data.for), Number(data.player)),
    );
    on("playerLeftScope", (data: { for: string; player: string }) =>
      this.scopes.get(Number(data.for))?.delete(Number(data.player)),
    );
    on("playerDropped", () => {
      const source = Number(globalThis.source);
      for (const other of this.scopes.get(source) ?? [])
        this.scopes.get(other)?.delete(source);
      this.scopes.delete(source);
    });
    this.seed();
  }

  /** The players in scope of each other right now: a grid of scope-sized cells, each player against 9 cells. */
  private seed(): void {
    const cells = new Map<number, { source: number; p: Vec3 }[]>();
    const all: { source: number; p: Vec3 }[] = [];
    for (let i = 0; i < GetNumPlayerIndices(); i++) {
      const source = Number(GetPlayerFromIndex(i));
      const entry = { source, p: coordsOf(source) };
      all.push(entry);
      const { cx, cy } = gridCell(entry.p.x, entry.p.y, SCOPE_RADIUS);
      const key = cellKey(cx, cy);
      const cell = cells.get(key);
      if (cell) cell.push(entry);
      else cells.set(key, [entry]);
    }
    for (const { source, p } of all) {
      const { cx, cy } = gridCell(p.x, p.y, SCOPE_RADIUS);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const other of cells.get(cellKey(cx + dx, cy + dy)) ?? [])
            if (
              other.source !== source &&
              flatDistance(other.p, p) <= SCOPE_RADIUS
            )
              this.link(source, other.source);
    }
  }

  of(source: number): ReadonlySet<number> {
    return this.scopes.get(source) ?? EMPTY;
  }
}

const EMPTY: ReadonlySet<number> = new Set();
const scopes = new Scopes();

scopes.start();
registerExport("GetPlayersInScope", (source: unknown) =>
  typeof source === "number" ? [...scopes.of(source)] : [],
);
