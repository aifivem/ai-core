import { CORE, type UnloadReason } from "@aicore-fivem/shared";
import { panel } from "../../content";
import { databaseReady } from "../../database";
import { log } from "../../log";
import { players } from "../../player/registry";
import { onScreenSwitch } from "../screen";
import { projection } from "./projection";

/** While the server boots a merely installed multichar keeps the tables (one may alter `users` as it starts, `docs/compat/multichar.md`). */
const BOOT_GRACE_MS = 60_000;

on(CORE.playerLoadedEvent, (source: number) => {
  const player = players.get(source);
  if (player) projection.connected(source, player.user.id);
});
on(
  CORE.playerUnloadedEvent,
  (source: number, charId: number, reason: UnloadReason) =>
    projection.unloaded(source, charId, reason),
);
on(CORE.characterDeletedEvent, (_charId: number, userId: number) =>
  projection.deleted(userId),
);
on(CORE.definitionsChangedEvent, (file: string, name: string) =>
  projection.definitionChanged(file, name),
);
onScreenSwitch(() => projection.reconcile());
panel.onChange("settings", () => projection.reconcile());
databaseReady
  .then(() => projection.reconcile())
  .catch((error: unknown) => log.error("framework tables", error));
setTimeout(() => projection.endBoot(), BOOT_GRACE_MS);
