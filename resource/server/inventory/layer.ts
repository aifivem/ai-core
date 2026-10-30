import { isRecord, type Logger } from "@aicore-fivem/lib/shared";
import type { InventoryAdapter, StashDefinition, UsableItemHandler, UsedItem } from "@aicore-fivem/shared";

/** What the layer needs from the game (stubbed in the bench). */
export interface LayerHost {
  isStarted(resource: string): boolean;
  version(resource: string): string;
  /** Tells the clients and the bridge which inventory answers now. */
  announce(resource: string | null): void;
  log: Logger;
}

/** The handler's item from any inventory's shape (`count` / `amount`, `metadata` / `info`). */
function toUsedItem(name: string, raw: unknown): UsedItem {
  const v = isRecord(raw) ? raw : {};
  const meta = isRecord(v.metadata) ? v.metadata : isRecord(v.info) ? v.info : {};
  const count = typeof v.count === "number" ? v.count : typeof v.amount === "number" ? v.amount : 0;
  return { name, slot: Number(v.slot) || 0, count, metadata: { ...meta } };
}

/**
 * ai-core's inventory layer: picks the active inventory (the panel's choice, or the first running one in priority
 * order) and keeps the usable items and stashes scripts register, so an inventory that becomes active later (or
 * restarts) gets them all again.
 */
export class InventoryLayer {
  private current: InventoryAdapter | null = null;
  private choice = "auto";
  private readonly usable = new Map<string, UsableItemHandler>();
  private readonly stashes = new Map<string, StashDefinition>();

  constructor(
    private readonly adapters: readonly InventoryAdapter[],
    private readonly host: LayerHost,
  ) {}

  /** `auto`, or the resource name of one adapter. */
  setChoice(choice: string): void {
    this.choice = choice;
    this.select();
  }

  /** Picks the inventory again; `stopping` is a resource on its way down whose state may still read started. */
  select(stopping?: string): void {
    const runs = (a: InventoryAdapter) => a.resource !== stopping && this.host.isStarted(a.resource);
    const auto = this.choice === "auto" || !this.adapters.some((a) => a.resource === this.choice);
    const next = (auto ? this.adapters.find(runs) : this.adapters.find((a) => a.resource === this.choice && runs(a))) ?? null;
    if (next === this.current) return;
    this.current = next;
    this.host.announce(next?.resource ?? null);
    if (!next) {
      this.host.log.info(auto ? "no inventory runs yet: item calls fail until one starts" : `the inventory picked in the panel (${this.choice}) does not run yet`);
      return;
    }
    const installed = this.host.version(next.resource);
    this.host.log.info(`inventory: ${next.resource} ${installed}`);
    if (installed !== next.version) this.host.log.warn(`${next.resource} ${installed} is installed; its adapter is written for ${next.version}`);
    for (const stash of this.stashes.values()) this.call("RegisterStash", (a) => a.registerStash(stash), undefined);
    if (next.registerUsableItem) for (const name of this.usable.keys()) this.call("RegisterUsableItem", (a) => a.registerUsableItem?.(name, this.dispatcher(name)), undefined);
  }

  /** Runs `fn` on the active adapter; `fallback` while none runs or when the inventory's export throws. */
  call<T>(what: string, fn: (adapter: InventoryAdapter) => T, fallback: T): T {
    const adapter = this.current;
    if (!adapter) return fallback;
    try {
      return fn(adapter);
    } catch (error) {
      this.host.log.error(`${adapter.resource} ${what} failed`, error);
      return fallback;
    }
  }

  registerStash(stash: StashDefinition): void {
    this.stashes.set(stash.name, stash);
    this.call("RegisterStash", (a) => a.registerStash(stash), undefined);
  }

  registerUsableItem(name: string, handler: UsableItemHandler): void {
    this.usable.set(name, handler);
    this.call("RegisterUsableItem", (a) => a.registerUsableItem?.(name, this.dispatcher(name)), undefined);
  }

  isUsable(name: string): boolean {
    return this.usable.has(name);
  }

  /** Runs an item's handler; false (keep the item) when none is registered or it throws (its resource stopped). */
  useItem(source: number, name: string, item: unknown): unknown {
    const handler = this.usable.get(name);
    if (!handler) return false;
    try {
      return handler(source, toUsedItem(name, item));
    } catch (error) {
      this.host.log.error(`usable item ${name} failed`, error);
      return false;
    }
  }

  private dispatcher(name: string): (source: number, item: unknown) => unknown {
    return (source, item) => this.useItem(source, name, item);
  }
}
