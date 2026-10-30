import { registerExport } from "@aicore-fivem/lib/client";
import { ResourceName } from "common";
import { dialogs } from "./menu";

/**
 * Closes the calling resource's open menu or input dialog from code (the bridge's ESX `CloseContext` /
 * `menu.close()`, qb-menu `closeMenu`); the request is answered with null like a player close.
 */
registerExport("CloseDialog", () =>
  dialogs.drop(GetInvokingResource() || ResourceName),
);
