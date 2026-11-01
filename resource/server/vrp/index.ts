import { onStop, registerExport } from "@aicore-fivem/lib/server";
import { CORE } from "@aicore-fivem/shared";
import { getCharacterInfo, type CharacterWithUser } from "../characters/info";
import { log } from "../log";
import { players } from "../player/registry";
import { vrpBackend } from "./backend";
import { seenPermissions, vrpConfig } from "./config";
import { vrpQuery } from "./query";
import { isVrpKind, type VrpKind } from "./data";
import { VrpStore } from "./store";

/**
 * ai-core's JS side of the vRP bridge (bridge/vrp): the key-value store behind vRP's UData / CData / SData / GData,
 * vRP's DB API, the panel's permission mapping and the character reads the Lua side cannot do from its mirror.
 * Every export is synchronous; answers that need the database come through a callback.
 */

/** Accounts with a loaded character (their `u` keys stay cached). */
const liveUsers = new Map<number, number>();

const FLUSH_DELAY_MS = 1000;
let flushTimer: ReturnType<typeof setTimeout> | null = null;

const store = new VrpStore({
  backend: vrpBackend,
  isLive: (kind, owner) =>
    kind === "c"
      ? players.byCharacter(Number(owner)) !== undefined
      : liveUsers.has(Number(owner)),
  onDirty: () => {
    flushTimer ??= setTimeout(() => {
      flushTimer = null;
      void store.flush();
    }, FLUSH_DELAY_MS);
  },
  onError: (what, error) => log.error(`vRP data: ${what} failed`, error),
});

on(CORE.playerLoadedEvent, (source: number) => {
  const userId = players.get(source)?.user.id;
  if (userId !== undefined)
    liveUsers.set(userId, (liveUsers.get(userId) ?? 0) + 1);
});

on(CORE.playerUnloadedEvent, (source: number, charId: number) => {
  const userId = players.get(source)?.user.id;
  if (userId !== undefined) {
    const left = (liveUsers.get(userId) ?? 1) - 1;
    if (left > 0) liveUsers.set(userId, left);
    else {
      liveUsers.delete(userId);
      store.release("u", String(userId));
    }
  }
  store.release("c", String(charId));
  void store.flush();
});

on("txAdmin:events:serverShuttingDown", () => void store.flush());
onStop(() => void store.flush());

const MAX_HEX = 16_000_000;
const HEX = /^(?:[0-9a-fA-F]{2})*$/;

/** The key of a data call, or null when an argument is wrong. */
function dataKey(
  kind: unknown,
  owner: unknown,
  key: unknown,
): [VrpKind, string, string] | null {
  if (!isVrpKind(kind)) return null;
  if (typeof owner !== "string" || owner.length > 64) return null;
  if (typeof key !== "string" || key === "" || key.length > 100) return null;
  return [kind, owner, key];
}

/** A data value as hex (`""` when unset) through `done`; at once for a cached key. */
registerExport(
  "VrpGetData",
  (kind: unknown, owner: unknown, key: unknown, done: unknown) => {
    if (typeof done !== "function") return;
    const answer = (hex: string) => {
      try {
        Reflect.apply(done, undefined, [hex]);
      } catch (error) {
        log.error("a VrpGetData callback failed", error);
      }
    };
    const parsed = dataKey(kind, owner, key);
    if (!parsed) return answer("");
    store.get(parsed[0], parsed[1], parsed[2], answer);
  },
);

/** Stores a data value (hex); written within a second, and when its character unloads. */
registerExport(
  "VrpSetData",
  (kind: unknown, owner: unknown, key: unknown, hex: unknown): boolean => {
    const parsed = dataKey(kind, owner, key);
    if (
      !parsed ||
      typeof hex !== "string" ||
      hex.length > MAX_HEX ||
      !HEX.test(hex)
    ) {
      log.warn(`VrpSetData refused ${String(kind)}/${String(key)}`);
      return false;
    }
    store.set(parsed[0], parsed[1], parsed[2], hex.toLowerCase());
    return true;
  },
);

/** vRP's `query` / `execute` / `scalar`: `done(error | null, ...)` (rows + affected, affected, or the value). */
registerExport(
  "VrpQuery",
  (sql: unknown, params: unknown, mode: unknown, done: unknown) => {
    if (typeof done !== "function") return;
    vrpQuery(sql, params, mode, (...answer) => {
      try {
        Reflect.apply(done, undefined, answer);
      } catch (error) {
        log.error("a VrpQuery callback failed", error);
      }
    });
  },
);

registerExport("GetVrpConfig", () => vrpConfig());

/** A permission string a script asked for (kept for the panel); true when it was new. */
registerExport("VrpPermissionAsked", (permission: unknown) =>
  seenPermissions.add(permission),
);

/** A character by id, loaded or not, with its account id; `done(info | null)`. */
registerExport("GetCharacterInfo", (charId: unknown, done: unknown) => {
  if (typeof done !== "function") return;
  getCharacterInfo(charId, (info: CharacterWithUser | null) => {
    try {
      Reflect.apply(done, undefined, [info]);
    } catch (error) {
      log.error("a GetCharacterInfo callback failed", error);
    }
  });
});
