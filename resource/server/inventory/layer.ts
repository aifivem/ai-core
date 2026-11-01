import { isRecord, type Logger } from "@aicore-fivem/lib/shared";
import { AdapterPicker } from "common/adapters";
import type {
  InventoryAdapter,
  ShopDefinition,
  StashDefinition,
  UsableItemHandler,
  UsedItem,
} from "@aicore-fivem/shared";

/** The handler's item from any inventory's shape (`count` / `amount`, `metadata` / `info`). */
function toUsedItem(name: string, raw: unknown): UsedItem {
  const v = isRecord(raw) ? raw : {};
  const meta = isRecord(v.metadata)
    ? v.metadata
    : isRecord(v.info)
      ? v.info
      : {};
  const count =
    typeof v.count === "number"
      ? v.count
      : typeof v.amount === "number"
        ? v.amount
        : 0;
  return { name, slot: Number(v.slot) || 0, count, metadata: { ...meta } };
}

/**
 * ai-core's inventory layer: picks the active inventory (the panel's choice, or the first running one in priority
 * order) and keeps the usable items, stashes and shops scripts register, so an inventory that becomes active later
 * (or restarts) gets them all again.
 */
export class InventoryLayer {
  private readonly usable = new Map<string, UsableItemHandler>();
  private readonly stashes = new Map<string, StashDefinition>();
  private readonly shops = new Map<string, ShopDefinition>();
  private readonly picker: AdapterPicker<InventoryAdapter>;

  /** `announce` tells the clients and the bridge which inventory answers now. */
  constructor(
    adapters: readonly InventoryAdapter[],
    choice: string,
    private readonly log: Logger,
    announce: (resource: string | null) => void,
  ) {
    this.picker = new AdapterPicker({
      category: "inventory",
      adapters,
      log: this.log,
      choice,
      noneText: "no inventory runs yet: item calls fail until one starts",
      onSwitch: (next) => {
        announce(next?.resource ?? null);
        if (next) this.handOver();
      },
    });
  }

  /** `auto`, or the resource name of one adapter. */
  setChoice(choice: string): void {
    this.picker.setChoice(choice);
  }

  /** Runs `fn` on the active adapter; `fallback` while none runs or when the inventory's export throws. */
  call<T>(what: string, fn: (adapter: InventoryAdapter) => T, fallback: T): T {
    return this.picker.call(what, fn, fallback);
  }

  registerStash(stash: StashDefinition): void {
    this.stashes.set(stash.name, stash);
    this.call("RegisterStash", (a) => a.registerStash(stash), undefined);
  }

  registerShop(shop: ShopDefinition): void {
    this.shops.set(shop.name, shop);
    this.call("RegisterShop", (a) => a.registerShop?.(shop), undefined);
  }

  /** Opens a kept shop; false when it is unknown or the inventory has no shops. */
  openShop(source: number, name: string): boolean {
    if (!this.shops.has(name)) return false;
    return this.call(
      "OpenShop",
      (a) => a.openShop?.(source, name) ?? false,
      false,
    );
  }

  registerUsableItem(name: string, handler: UsableItemHandler): void {
    this.usable.set(name, handler);
    this.call(
      "RegisterUsableItem",
      (a) => a.registerUsableItem?.(name, this.dispatcher(name)),
      undefined,
    );
  }

  isUsable(name: string): boolean {
    return this.usable.has(name);
  }

  /** Names of every item with a registered handler. */
  usableNames(): string[] {
    return [...this.usable.keys()];
  }

  /** Runs an item's handler; false (keep the item) when none is registered or it throws (its resource stopped). */
  useItem(source: number, name: string, item: unknown): unknown {
    const handler = this.usable.get(name);
    if (!handler) return false;
    try {
      return handler(source, toUsedItem(name, item));
    } catch (error) {
      this.log.error(`usable item ${name} failed`, error);
      return false;
    }
  }

  /** Gives the inventory that just became active every kept stash, shop and usable item. */
  private handOver(): void {
    for (const stash of this.stashes.values())
      this.call("RegisterStash", (a) => a.registerStash(stash), undefined);
    for (const shop of this.shops.values())
      this.call("RegisterShop", (a) => a.registerShop?.(shop), undefined);
    for (const name of this.usable.keys())
      this.call(
        "RegisterUsableItem",
        (a) => a.registerUsableItem?.(name, this.dispatcher(name)),
        undefined,
      );
  }

  private dispatcher(name: string): (source: number, item: unknown) => unknown {
    return (source, item) => this.useItem(source, name, item);
  }
}
