import { notify } from "@aicore-fivem/lib/server";
import { ADMIN_PLAYERS, type Position } from "common/adminPlayers";
import { Locale } from "common";
import { inventory } from "../../inventory";
import { medical } from "../../medical";
import { claims, players } from "../../player/registry";
import { action, BUSY, GONE, logEdit, onCharacter, parse } from "./gate";
import { fail, offline, OK } from "./offline";
import { softDelete } from "./repo";
import { loadView } from "./view";
import { playerWatchers } from "./watchers";

/** Player actions of the Players section: position, kick, revive, items, inventory, delete. */

function pedPosition(source: number): Position {
  const ped = GetPlayerPed(String(source));
  const [x = 0, y = 0, z = 0] = GetEntityCoords(ped);
  return { x, y, z, heading: GetEntityHeading(ped) };
}

const charOnly = ([charId]: unknown[]) => {
  const id = parse.charId(charId);
  return id === null ? null : ([id] as const);
};

// The admin goes to the character: to its ped while online, else to where it spawns next.
action("goto", charOnly, async (source, charId) => {
  const player = players.byCharacter(charId);
  let point: Position | null = player ? pedPosition(player.source) : null;
  if (!player) {
    const view = await loadView(charId);
    if (!view) return GONE;
    point = view.position;
  }
  if (!point) return fail("ADMIN_PLAYERS_ERR_POSITION");
  emitNet(ADMIN_PLAYERS.teleportEvent, source, point);
  logEdit(source, charId, "went to the character", { ...point });
  return OK;
});

// The character comes to the admin: teleported while online, else it spawns there next time.
action("bring", charOnly, async (source, charId) => {
  const point = pedPosition(source);
  const result = await onCharacter(
    charId,
    (player) => {
      if (player.source === source) return fail("ADMIN_PLAYERS_ERR_SELF");
      emitNet(ADMIN_PLAYERS.teleportEvent, player.source, point);
      notify(player.source, Locale("ADMIN_PLAYERS_NOTIFY_BROUGHT"), "info");
      playerWatchers.char(charId, { position: point });
      return OK;
    },
    () => offline.position(charId, point),
  );
  if (result.ok) logEdit(source, charId, "brought the character", { ...point });
  return result;
});

action(
  "kick",
  ([charId, reason]) => {
    const id = parse.charId(charId);
    const why = parse.text(reason ?? "", 0, 120);
    return id === null || why === null ? null : ([id, why] as const);
  },
  async (source, charId, reason) => {
    const result = await onCharacter(
      charId,
      (player) => {
        if (player.source === source) return fail("ADMIN_PLAYERS_ERR_SELF");
        logEdit(source, charId, "kicked the player", { reason }, "warn");
        DropPlayer(
          String(player.source),
          reason
            ? Locale("ADMIN_PLAYERS_KICKED_REASON", reason)
            : Locale("ADMIN_PLAYERS_KICKED"),
        );
        return OK;
      },
      null,
    );
    return result;
  },
);

// Through ai-core's medical layer: a downed player gets up, anyone else is healed.
action("revive", charOnly, async (source, charId) => {
  if (!medical.active) return fail("ADMIN_PLAYERS_ERR_NO_DEATH");
  const result = await onCharacter(
    charId,
    (player) => {
      const target = player.source;
      if (!medical.call("revive", (a) => a.revive(target), false))
        medical.call("heal", (a) => a.heal(target), undefined);
      notify(target, Locale("ADMIN_PLAYERS_NOTIFY_REVIVED"), "success");
      return OK;
    },
    null,
  );
  if (result.ok) logEdit(source, charId, "revived the player");
  return result;
});

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

// Soft delete of an offline character (an online one is kicked first).
action("delete", charOnly, async (source, charId) => {
  if (players.byCharacter(charId)) return fail("ADMIN_PLAYERS_ERR_ONLINE");
  const result = await claims.run(charId, BUSY, async () => {
    if (players.byCharacter(charId)) return BUSY;
    return (await softDelete(charId)) ? OK : GONE;
  });
  if (result.ok) {
    logEdit(source, charId, "deleted the character", {}, "warn");
    playerWatchers.deleted(charId);
  }
  return result;
});
