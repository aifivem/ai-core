import { registerExport } from "@aicore-fivem/lib/server";

/**
 * Who is in whose OneSync scope (~424 m), from `playerEnteredScope` / `playerLeftScope`. These events cost per player
 * in scope, so only ai-core listens; every resource asks `GetPlayersInScope` (lib `playersNear`). Players already in
 * scope when ai-core starts are found once from a scope-sized grid.
 */
const SCOPE_RADIUS = 424;

type Vec = { x: number; y: number; z: number };

const posOf = (source: number): Vec => {
  const [x = 0, y = 0, z = 0] = GetEntityCoords(GetPlayerPed(String(source)));
  return { x, y, z };
};

class Scopes {
  private readonly scopes = new Map<number, Set<number>>();

  private link(a: number, b: number): void {
    let set = this.scopes.get(a);
    if (!set) this.scopes.set(a, (set = new Set()));
    set.add(b);
  }

  start(): void {
    on("playerEnteredScope", (data: { for: string; player: string }) => this.link(Number(data.for), Number(data.player)));
    on("playerLeftScope", (data: { for: string; player: string }) => this.scopes.get(Number(data.for))?.delete(Number(data.player)));
    on("playerDropped", () => {
      const source = Number(globalThis.source);
      for (const other of this.scopes.get(source) ?? []) this.scopes.get(other)?.delete(source);
      this.scopes.delete(source);
    });
    this.seed();
  }

  /** The players in scope of each other right now: a grid of scope-sized cells, each player against 9 cells. */
  private seed(): void {
    const cells = new Map<string, { source: number; p: Vec }[]>();
    const all: { source: number; p: Vec }[] = [];
    for (let i = 0; i < GetNumPlayerIndices(); i++) {
      const source = Number(GetPlayerFromIndex(i));
      const entry = { source, p: posOf(source) };
      all.push(entry);
      const key = `${Math.floor(entry.p.x / SCOPE_RADIUS)}:${Math.floor(entry.p.y / SCOPE_RADIUS)}`;
      const cell = cells.get(key);
      if (cell) cell.push(entry);
      else cells.set(key, [entry]);
    }
    for (const { source, p } of all) {
      const cx = Math.floor(p.x / SCOPE_RADIUS);
      const cy = Math.floor(p.y / SCOPE_RADIUS);
      for (let dx = -1; dx <= 1; dx++)
        for (let dy = -1; dy <= 1; dy++)
          for (const other of cells.get(`${cx + dx}:${cy + dy}`) ?? [])
            if (other.source !== source && Math.hypot(other.p.x - p.x, other.p.y - p.y) <= SCOPE_RADIUS) this.link(source, other.source);
    }
  }

  of(source: number): ReadonlySet<number> {
    return this.scopes.get(source) ?? EMPTY;
  }
}

const EMPTY: ReadonlySet<number> = new Set();
const scopes = new Scopes();

scopes.start();
registerExport("GetPlayersInScope", (source: unknown) => (typeof source === "number" ? [...scopes.of(source)] : []));
