import { caller, registerExport } from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import type { RadialAdapter, RadialItem } from "@aicore-fivem/shared";
import { RADIALS } from "./registry";
import { toRadialItem } from "./parse";
import { AdapterPicker } from "common/adapters";

const log = createLogger("ai-core");

/**
 * ai-core's radial layer: scripts add wheel items here (lib `radial`) and the first running radial menu shows them
 * through its adapter (`registry.ts`). Items are kept per adding resource: a radial that starts later or restarts gets
 * all of them again; a stopped resource's items go.
 */
class RadialLayer {
  /** In the order scripts added them (a radial that starts later gets them in that order), so not `ByResource`. */
  private readonly items = new Map<
    string,
    { item: RadialItem; owner: string }
  >();
  private readonly picker = new AdapterPicker({
    category: "radial menu",
    adapters: RADIALS,
    log,
    onSwitch: (next, previous) => this.handOver(next, previous),
  });

  add(item: RadialItem, owner: string): void {
    const old = this.items.get(item.id);
    if (old)
      this.picker.call("radial remove", (a) => a.remove(old.item), undefined);
    this.items.set(item.id, { item, owner });
    this.picker.call("radial add", (a) => a.add(item), undefined);
  }

  remove(id: string): void {
    const entry = this.items.get(id);
    if (!entry) return;
    this.items.delete(id);
    this.picker.call("radial remove", (a) => a.remove(entry.item), undefined);
  }

  refresh(): void {
    this.picker.call("radial refresh", (a) => a.refresh(), undefined);
  }

  dropOwner(owner: string): void {
    for (const [id, entry] of this.items)
      if (entry.owner === owner) this.remove(id);
  }

  /** Moves every item to the radial that became active (or started again); a still running old one loses them. */
  private handOver(
    next: RadialAdapter | null,
    previous: RadialAdapter | null,
  ): void {
    if (previous && previous !== next && this.picker.runs(previous.resource))
      for (const { item } of this.items.values()) previous.remove(item);
    if (next)
      for (const { item } of this.items.values())
        this.picker.call("radial add", (a) => a.add(item), undefined);
  }
}

const layer = new RadialLayer();
on("onClientResourceStop", (resource: string) => layer.dropOwner(resource));

registerExport("AddRadialItem", (item: unknown) => {
  const parsed = toRadialItem(item);
  if (parsed) layer.add(parsed, caller());
  else log.warn(`${caller()} AddRadialItem: not a radial item`);
});
registerExport(
  "RemoveRadialItem",
  (id: unknown) => typeof id === "string" && layer.remove(id),
);
registerExport("RefreshRadial", () => layer.refresh());
