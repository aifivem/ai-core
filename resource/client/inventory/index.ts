import {
  GlobalKey,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { INVENTORY_STATE_KEY } from "@aicore-fivem/shared";
import { AdapterFollower } from "common/adapters";
import { aiInventory } from "./adapters/ai-inventory";
import { codemInventory } from "./adapters/codem-inventory";
import { coreInventory } from "./adapters/core_inventory";
import { jaksamInventory } from "./adapters/jaksam_inventory";
import { origenInventory } from "./adapters/origen_inventory";
import { oxInventory } from "./adapters/ox_inventory";
import { qbInventory } from "./adapters/qb-inventory";
import { qsInventory } from "./adapters/qs-inventory";
import { tgiannInventory } from "./adapters/tgiann-inventory";
import "./definitions";

/** The client half of the inventory layer: follows the inventory the server picked (GlobalState). */
const inventory = new AdapterFollower(
  [
    aiInventory,
    tgiannInventory,
    oxInventory,
    qbInventory,
    qsInventory,
    codemInventory,
    coreInventory,
    origenInventory,
    jaksamInventory,
  ],
  new GlobalKey(INVENTORY_STATE_KEY, stateString),
  createLogger("ai-core"),
);

registerExport("OpenInventory", () =>
  inventory.call("openInventory", (a) => a.openInventory(), undefined),
);
registerExport(
  "HasItem",
  (item: unknown, count?: unknown) =>
    typeof item === "string" &&
    inventory.call(
      "hasItem",
      (a) =>
        a.hasItem(item, typeof count === "number" && count > 0 ? count : 1),
      false,
    ),
);
registerExport("GetItemCount", (item: unknown) =>
  typeof item === "string"
    ? inventory.call("itemCount", (a) => a.itemCount(item), null)
    : null,
);
registerExport("GetCurrentWeapon", () =>
  inventory.call("currentWeapon", (a) => a.currentWeapon(), null),
);
