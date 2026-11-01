import { onClientCallback, registerExport } from "@aicore-fivem/lib/server";
import {
  CORE,
  toCreateCharacter,
  type CharacterActionResult,
  type CharacterScreen,
} from "@aicore-fivem/shared";
import { Locale } from "common";
import { deleteCharacter } from "../characters/repo";
import { settings } from "../content";
import { databaseReady } from "../database";
import { coreLog } from "../logs";
import { externalScreen } from "../multichar/screen";
import { BUSY, lock } from "./actionLock";
import { enterSelectBucket, leaveSelectBucket } from "./buckets";
import { createNow } from "./create";
import { loadCharacter, unloadCharacter } from "./load";
import { players, selecting } from "./registry";
import { characterScreen } from "./screen";
import { identify, upsertUser } from "./users";

/**
 * The character screen's callbacks (cards, create, select, delete), logout and switch, and the drop of a player.
 * Loading and unloading: `load.ts`; creating: `create.ts`.
 */

/** First call of the character screen after joining (or after switching): the account and its characters. */
onClientCallback(
  CORE.charactersCallback,
  async (source): Promise<CharacterScreen | null> => {
    // An external character screen runs: ai-core's stays shut (no bucket, no cards).
    if (players.get(source) || externalScreen()) return null;
    return lock.run(source, null, async () => {
      await databaseReady;
      let user = selecting.get(source);
      if (!user) {
        const identity = identify(source);
        if (!identity) {
          DropPlayer(String(source), Locale("CONNECT_NO_FIVEM"));
          return null;
        }
        user = await upsertUser(identity);
        selecting.set(source, user);
      }
      enterSelectBucket(source);
      const screen = await characterScreen(user);
      emit(
        CORE.characterScreenEvent,
        source,
        screen.characters.map((card) => card.id),
      );
      return screen;
    });
  },
);

/** A character id from the client: a whole positive number (ownership is checked against the account later). */
const charIdArg = ([charId]: unknown[]): [number] | null =>
  typeof charId === "number" && Number.isInteger(charId) && charId > 0
    ? [charId]
    : null;

// The form is checked by toCreateCharacter, which names the failing field for the screen.
onClientCallback(
  CORE.createCharacterCallback,
  { args: ([raw]) => [raw] },
  async (source, raw): Promise<CharacterActionResult> => {
    // Under an external screen characters are made only through its login exports, never from ai-core's screen.
    if (externalScreen()) return BUSY;
    const user = selecting.get(source);
    const input = toCreateCharacter(raw);
    if (!user) return BUSY;
    if ("error" in input) return { ok: false, error: input.error };
    return lock.run(source, BUSY, () => createNow(source, user, input));
  },
);

onClientCallback(
  CORE.selectCharacterCallback,
  { args: charIdArg },
  async (source, charId): Promise<CharacterActionResult> => {
    if (externalScreen() || !selecting.has(source)) return BUSY;
    return lock.run(source, BUSY, () => loadCharacter(source, charId));
  },
);

onClientCallback(
  CORE.deleteCharacterCallback,
  { args: charIdArg },
  async (source, charId): Promise<CharacterActionResult> => {
    const user = selecting.get(source);
    if (externalScreen() || !user) return BUSY;
    if (!settings.characters.canDelete)
      return { ok: false, error: "CHAR_ERR_NO_DELETE" };
    if (players.byCharacter(charId))
      return { ok: false, error: "CHAR_ERR_ONLINE" };
    return lock.run(source, BUSY, async () => {
      if (!(await deleteCharacter(user.id, charId)))
        return { ok: false, error: "CHAR_ERR_GONE" };
      emit(CORE.characterDeletedEvent, charId, user.id);
      coreLog("characters", `deleted character #${charId}`, {
        level: "warn",
        source,
        metadata: { charId },
      });
      return { ok: true };
    });
  },
);

/**
 * Back to the character screen (logout without leaving): ai-core's screen opens again, or an external one is told
 * (`externalLogoutEvent`) and shows itself. Resolves false when no character is loaded (or another action runs).
 */
export function logoutCharacter(source: number): Promise<boolean> {
  const player = players.get(source);
  if (!player) return Promise.resolve(false);
  return lock.run(source, false, async () => {
    if (players.get(source) !== player) return false;
    await unloadCharacter(player, "switch");
    selecting.set(source, player.user);
    emitNet(
      externalScreen() ? CORE.externalLogoutEvent : CORE.openCharactersEvent,
      source,
    );
    return true;
  });
}

export function switchCharacter(source: number): boolean {
  if (!players.get(source)) return false;
  void logoutCharacter(source);
  return true;
}

registerExport("SwitchCharacter", switchCharacter);

on("playerDropped", () => {
  const source = Number(globalThis.source);
  lock.release(source);
  selecting.delete(source);
  leaveSelectBucket(source);
  const player = players.get(source);
  if (player) void unloadCharacter(player, "dropped");
});
