import { registerExport } from "@aicore-fivem/lib/client"
import { createLogger } from "@aicore-fivem/lib/shared"
import {
  INVENTORY_STATE_KEY,
  type InventoryClientAdapter,
} from "@aicore-fivem/shared"
import { aiInventory } from "./adapters/ai-inventory"
import { oxInventory } from "./adapters/ox_inventory"
import { qbInventory } from "./adapters/qb-inventory"
import { tgiannInventory } from "./adapters/tgiann-inventory"

const log = createLogger("ai-core")

/** The client half of the inventory layer: follows the inventory the server picked (GlobalState). */
class ClientInventory {
  private current: InventoryClientAdapter | null = null

  constructor(private readonly adapters: readonly InventoryClientAdapter[]) {}

  set(resource: unknown): void {
    this.current = this.adapters.find((a) => a.resource === resource) ?? null
  }

  open(): void {
    this.run("openInventory", (a) => a.openInventory(), undefined)
  }

  has(item: string, count: number): boolean {
    return this.run("hasItem", (a) => a.hasItem(item, count), false)
  }

  private run<T>(
    what: string,
    fn: (adapter: InventoryClientAdapter) => T,
    fallback: T
  ): T {
    const adapter = this.current
    if (!adapter) return fallback
    try {
      return fn(adapter)
    } catch (error) {
      log.error(`${adapter.resource} ${what} failed`, error)
      return fallback
    }
  }
}

const inventory = new ClientInventory([
  aiInventory,
  tgiannInventory,
  oxInventory,
  qbInventory,
])
inventory.set(GlobalState[INVENTORY_STATE_KEY])
AddStateBagChangeHandler(
  INVENTORY_STATE_KEY,
  "global",
  (_bag: string, _key: string, value: unknown) => inventory.set(value)
)

registerExport("OpenInventory", () => inventory.open())
registerExport(
  "HasItem",
  (item: unknown, count?: unknown) =>
    typeof item === "string" &&
    inventory.has(item, typeof count === "number" && count > 0 ? count : 1)
)
