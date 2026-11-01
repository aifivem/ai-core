import { entityCoords, notify } from "@aicore-fivem/lib/server";
import { CORE } from "@aicore-fivem/shared";
import { ADMIN_PLAYERS, type Position } from "common/adminPlayers";
import { Locale } from "common";
import { findCharacter } from "../../characters/repo";
import { medical } from "../../medical";
import { claims, players } from "../../player/registry";
import {
  action,
  BUSY,
  charOnly,
  GONE,
  logEdit,
  onCharacter,
  parse,
} from "./gate";
import { fail, offline, OK } from "./offline";
import { softDelete } from "./repo";
import { loadView } from "./view";
import { charWatchers } from "./charWatchers";

/** Player actions of the Players section: position, kick, revive, kill, delete (items: `inventoryActions.ts`). */

function pedPosition(source: number): Position {
  const ped = GetPlayerPed(String(source));
  return { ...entityCoords(ped), heading: GetEntityHeading(ped) };
}

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
      charWatchers.char(charId, { position: point });
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

// Health is client-owned (no server setter): the target's own ai-core client sets it to 0, so any death script sees
// an ordinary death.
action("kill", charOnly, async (source, charId) => {
  const result = await onCharacter(
    charId,
    (player) => {
      emitNet(ADMIN_PLAYERS.killEvent, player.source);
      notify(player.source, Locale("ADMIN_PLAYERS_NOTIFY_KILLED"), "error");
      return OK;
    },
    null,
  );
  if (result.ok) logEdit(source, charId, "killed the player", {}, "warn");
  return result;
});

// Soft delete of an offline character (an online one is kicked first).
action("delete", charOnly, async (source, charId) => {
  if (players.byCharacter(charId)) return fail("ADMIN_PLAYERS_ERR_ONLINE");
  const result = await claims.run(charId, BUSY, async () => {
    if (players.byCharacter(charId)) return BUSY;
    const row = await findCharacter(charId);
    if (!row || !(await softDelete(charId))) return GONE;
    emit(CORE.characterDeletedEvent, charId, row.userId);
    return OK;
  });
  if (result.ok) {
    logEdit(source, charId, "deleted the character", {}, "warn");
    charWatchers.deleted(charId);
  }
  return result;
});
