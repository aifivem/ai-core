import { inventory } from "../../inventory/active";
import { action, charOnly, logEdit, onCharacter, parse } from "./gate";
import { fail, OK } from "./offline";

/** Item actions of the Players section: give items and open the player's inventory (loaded characters only). */

// Through ai-core's inventory layer, so any adapted inventory works; only for a loaded character.
action(
  "item",
  ([charId, item, count, mode]) => {
    const id = parse.charId(charId);
    const name = parse.name(item);
    const n = parse.int(count, 1, 10_000);
    const m = mode === "give" || mode === "remove" ? mode : null;
    return id === null || name === null || n === null || m === null
      ? null
      : ([id, name.toLowerCase(), n, m] as const);
  },
  async (source, charId, item, count, mode) => {
    if (
      !inventory.call(
        "GetItemDefinition",
        (a) => a.getItemDefinition(item),
        null,
      )
    )
      return fail("ADMIN_PLAYERS_ERR_ITEM");
    const result = await onCharacter(
      charId,
      (player) => {
        const target = player.source;
        if (mode === "give")
          return inventory.call(
            "AddItem",
            (a) => a.addItem(target, item, count, undefined, undefined),
            false,
          )
            ? OK
            : fail("ADMIN_PLAYERS_ERR_ITEM_FULL");
        const has = inventory.call(
          "GetItemCount",
          (a) => a.getItemCount(target, item, undefined),
          0,
        );
        if (has <= 0) return fail("ADMIN_PLAYERS_ERR_ITEM_NONE");
        const take = Math.min(count, has);
        return inventory.call(
          "RemoveItem",
          (a) => a.removeItem(target, item, take, undefined, undefined),
          false,
        )
          ? OK
          : fail("ADMIN_PLAYERS_ERR_ITEM_NONE");
      },
      null,
    );
    if (result.ok)
      logEdit(source, charId, `${mode} item ${item} x${count}`, {
        item,
        count,
        mode,
      });
    return result;
  },
);

action("inventory", charOnly, async (source, charId) => {
  const result = await onCharacter(
    charId,
    (player) =>
      inventory.call(
        "OpenInventory",
        (a) => a.openInventory(source, player.source),
        false,
      )
        ? OK
        : fail("ADMIN_PLAYERS_ERR_INVENTORY"),
    null,
  );
  if (result.ok) logEdit(source, charId, "opened the inventory");
  return result;
});
