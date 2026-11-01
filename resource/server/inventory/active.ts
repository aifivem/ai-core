import { GlobalKey, stateString } from "@aicore-fivem/lib/server";
import {
  CORE,
  INVENTORY_STATE_KEY,
  ITEM_DEFINITIONS_CHANGED_EVENT,
} from "@aicore-fivem/shared";
import { panel, settings } from "../content";
import { log } from "../log";
import { ClientItemDefinitions } from "./clientDefinitions";
import { InventoryLayer } from "./layer";
import { INVENTORIES } from "./registry";

/**
 * ai-core's inventory exports: every script (lib `inventory`) and the bridge call these, the active inventory
 * answers through its adapter (`registry.ts`). The choice follows the panel setting and inventory starts / stops.
 */

const activeInventory = new GlobalKey(INVENTORY_STATE_KEY, stateString);

const clientDefinitions = new ClientItemDefinitions(() =>
  inventory.call("GetItemDefinitions", (a) => a.getItemDefinitions(), null),
);

export const inventory = new InventoryLayer(
  INVENTORIES,
  settings.inventory,
  log,
  (resource) => {
    activeInventory.set(resource ?? undefined);
    emit(CORE.inventoryChangedEvent, resource);
    // The first pick runs inside the constructor: read the definitions once `inventory` exists.
    if (resource) queueMicrotask(() => clientDefinitions.refresh());
  },
);
panel.onChange("settings", () => inventory.setChoice(settings.inventory));
on(ITEM_DEFINITIONS_CHANGED_EVENT, () => clientDefinitions.refresh());
