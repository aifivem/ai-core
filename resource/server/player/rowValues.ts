import type { CharacterInfo } from "@aicore-fivem/shared";
import type { CharacterRow } from "../characters/repo";

/** Values a loaded character's row gives (`Player`): its info and what the saved metadata holds. */

export function characterInfo(row: CharacterRow): CharacterInfo {
  const {
    id,
    citizenid,
    slot,
    firstname,
    lastname,
    birthdate,
    sex,
    nationality,
  } = row;
  return {
    id,
    citizenid,
    slot,
    firstname,
    lastname,
    birthdate,
    sex,
    nationality,
  };
}

/** Saved body armour (metadata `armor`, QB's key), 0-100; set again on the ped at spawn. */
export function savedArmour(metadata: Record<string, unknown>): number {
  const value = metadata.armor;
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : 0;
}

/**
 * Saved ped health (metadata `health`), set again at spawn; 0 when none is saved or it is 100 or below (GTA's dead
 * line: a downed character comes back down through the death script's `isdead`, never by spawning dead).
 */
export function savedHealth(metadata: Record<string, unknown>): number {
  const value = metadata.health;
  return typeof value === "number" && Number.isFinite(value) && value > 100
    ? Math.round(value)
    : 0;
}

/** Seconds played as stored in metadata `playtime`. */
export function savedPlayTime(metadata: Record<string, unknown>): number {
  const value = metadata.playtime;
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/** The job the character was last on duty in (metadata `lastDutyJob`). */
export function savedLastDuty(
  metadata: Record<string, unknown>,
): string | null {
  return typeof metadata.lastDutyJob === "string" ? metadata.lastDutyJob : null;
}

/** The character fields the admin panel edits on a loaded player (`Player.setInfo`). */
export type InfoEdit = Pick<
  CharacterInfo,
  "firstname" | "lastname" | "birthdate" | "nationality"
>;
