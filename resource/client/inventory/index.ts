import {
  GlobalKey,
  registerExport,
  stateString,
} from "@aicore-fivem/lib/client";
import { createLogger } from "@aicore-fivem/lib/shared";
import { INVENTORY_STATE_KEY } from "@aicore-fivem/shared";
import { AdapterFollower } from "common/adapters";
import { aiInventory } from "./adapters/ai-inventory";
import { oxInventory } from "./adapters/ox_inventory";
import { qbInventory } from "./adapters/qb-inventory";
import { tgiannInventory } from "./adapters/tgiann-inventory";

/** The client half of the inventory layer: follows the inventory the server picked (GlobalState). */
const inventory = new AdapterFollower(
  [aiInventory, tgiannInventory, oxInventory, qbInventory],
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
registerExport("GetCurrentWeapon", () =>
  inventory.call("currentWeapon", (a) => a.currentWeapon(), null),
);
