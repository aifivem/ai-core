import { isResourceStarted, registerExport } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import type { RadialAdapter, RadialItem } from "@aicore-fivem/shared";
import { RADIALS } from "./registry";
import { toRadialItem } from "./parse";

const log = createLogger("ai-core");

/** The resource names a resource stands in for (its `provide` lines). */
const provides = (resource: string): string[] =>
  Array.from({ length: GetNumResourceMetadata(resource, "provide") }, (_, i) =>
    GetResourceMetadata(resource, "provide", i),
  );

/**
 * ai-core's radial layer: scripts add wheel items here (lib `radial`) and the first running radial menu shows them
 * through its adapter (`registry.ts`). Items are kept per adding resource: a radial that starts later or restarts gets
 * all of them again; a stopped resource's items go.
 */
class RadialLayer {
  private readonly items = new Map<
    string,
    { item: RadialItem; owner: string }
  >();
  private current: RadialAdapter | null = null;

  add(item: RadialItem, owner: string): void {
    const old = this.items.get(item.id);
    if (old) this.run("remove", (a) => a.remove(old.item));
    this.items.set(item.id, { item, owner });
    this.run("add", (a) => a.add(item));
  }

  remove(id: string): void {
    const entry = this.items.get(id);
    if (!entry) return;
    this.items.delete(id);
    this.run("remove", (a) => a.remove(entry.item));
  }

  refresh(): void {
    this.run("refresh", (a) => a.refresh());
  }

  dropOwner(owner: string): void {
    for (const [id, entry] of this.items)
      if (entry.owner === owner) this.remove(id);
  }

  /** Picks the radial again; `stopping` may still read started, `started` (re)started and needs every item again. */
  select(stopping?: string, started?: string): void {
    // The names a stopping resource `provide`s (ai-radialmenu: qb-radialmenu...) still read started too.
    const gone = new Set(stopping ? [stopping, ...provides(stopping)] : []);
    const next =
      RADIALS.find(
        (a) => !gone.has(a.resource) && isResourceStarted(a.resource),
      ) ?? null;
    if (next === this.current && next?.resource !== started) return;
    const old = this.current;
    if (old && old !== next && !gone.has(old.resource))
      for (const { item } of this.items.values())
        this.run("remove", (a) => a.remove(item), old);
    this.current = next;
    if (next !== old) log.info(`radial menu: ${next?.resource ?? "none"}`);
    for (const { item } of this.items.values())
      this.run("add", (a) => a.add(item));
  }

  private run(
    what: string,
    fn: (adapter: RadialAdapter) => void,
    adapter = this.current,
  ): void {
    if (!adapter) return;
    try {
      fn(adapter);
    } catch (error) {
      log.error(`${adapter.resource} radial ${what} failed`, error);
    }
  }
}

const layer = new RadialLayer();
layer.select();

const candidates = new Set(RADIALS.map((a) => a.resource));
on(
  "onClientResourceStart",
  (resource: string) =>
    candidates.has(resource) && layer.select(undefined, resource),
);
on("onClientResourceStop", (resource: string) => {
  layer.dropOwner(resource);
  if (!candidates.has(resource)) return;
  layer.select(resource);
  setTimeout(() => layer.select(), 0);
});

registerExport("AddRadialItem", (item: unknown) => {
  const parsed = toRadialItem(item);
  if (parsed) layer.add(parsed, GetInvokingResource() ?? "");
  else log.warn(`${GetInvokingResource()} AddRadialItem: not a radial item`);
});
registerExport(
  "RemoveRadialItem",
  (id: unknown) => typeof id === "string" && layer.remove(id),
);
registerExport("RefreshRadial", () => layer.refresh());
