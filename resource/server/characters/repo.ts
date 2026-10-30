import { isRecord } from "@aicore-fivem/lib/shared";
import type { CharacterInfo, CreateCharacterInput, Sex } from "@aicore-fivem/shared";
import { mysql } from "@aicore-fivem/mysql";

/** SQL of characters. Every function takes the account (user id) so one account never touches another's rows. */

export interface CharacterRow extends CharacterInfo {
  userId: number;
  position: { x: number; y: number; z: number; heading: number } | null;
  metadata: Record<string, unknown>;
  lastPlayed: number | null;
}

interface RawRow {
  id: number;
  user_id: number;
  citizenid: string;
  slot: number;
  firstname: string;
  lastname: string;
  birthdate: number | string;
  sex: string;
  pos_x: number | null;
  pos_y: number | null;
  pos_z: number | null;
  pos_h: number | null;
  metadata: string;
  last_played: number | null;
}

const COLUMNS =
  "id, user_id, citizenid, slot, firstname, lastname, birthdate, sex, pos_x, pos_y, pos_z, pos_h, metadata, last_played";

/** The engine returns DATE as epoch ms (server local time, as oxmysql does); the screen shows YYYY-MM-DD. */
function toDate(value: number | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(value);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toRow(raw: RawRow): CharacterRow {
  let metadata: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(raw.metadata);
    if (isRecord(parsed)) metadata = parsed;
  } catch {
    // A broken bag starts empty; the next save writes a valid one.
  }
  const sex: Sex = raw.sex === "female" ? "female" : "male";
  const hasPosition = raw.pos_x !== null && raw.pos_y !== null && raw.pos_z !== null;
  return {
    id: raw.id,
    userId: raw.user_id,
    citizenid: raw.citizenid,
    slot: raw.slot,
    firstname: raw.firstname,
    lastname: raw.lastname,
    birthdate: toDate(raw.birthdate),
    sex,
    position: hasPosition ? { x: raw.pos_x ?? 0, y: raw.pos_y ?? 0, z: raw.pos_z ?? 0, heading: raw.pos_h ?? 0 } : null,
    metadata,
    lastPlayed: raw.last_played,
  };
}

export async function listCharacters(userId: number): Promise<CharacterRow[]> {
  const rows = await mysql.query<RawRow[]>(
    `SELECT ${COLUMNS} FROM ai_core_characters WHERE user_id = ? AND deleted_at IS NULL ORDER BY slot`,
    [userId],
  );
  return (rows ?? []).map(toRow);
}

export async function getCharacter(userId: number, charId: number): Promise<CharacterRow | null> {
  const row = await mysql.single<RawRow>(
    `SELECT ${COLUMNS} FROM ai_core_characters WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [charId, userId],
  );
  return row ? toRow(row) : null;
}

/**
 * Inserts a character; its citizen id is its row id ("1", "2", ...: ids count up one by one, owner decision). The row
 * goes in with a unique placeholder (the column is NOT NULL UNIQUE) and takes its id right after.
 */
export async function insertCharacter(userId: number, input: CreateCharacterInput): Promise<number> {
  const placeholder = `~${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`.slice(0, 16);
  const id = await mysql.insert(
    "INSERT INTO ai_core_characters (user_id, citizenid, slot, firstname, lastname, birthdate, sex) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [userId, placeholder, input.slot, input.firstname, input.lastname, input.birthdate, input.sex],
  );
  if (!id) throw new Error("could not create the character");
  const changed = await mysql.update("UPDATE ai_core_characters SET citizenid = ? WHERE id = ?", [String(id), id]).catch(() => 0);
  if (!changed) {
    await mysql.update("DELETE FROM ai_core_characters WHERE id = ?", [id]);
    throw new Error(`citizen id ${id} is already taken`);
  }
  return id;
}

/** Soft delete: the row stays for logs and is never loaded again. */
export async function deleteCharacter(userId: number, charId: number): Promise<boolean> {
  const changed = await mysql.update(
    "UPDATE ai_core_characters SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
    [charId, userId],
  );
  return (changed ?? 0) > 0;
}

export interface CharacterSave {
  id: number;
  position: { x: number; y: number; z: number; heading: number };
  metadata: Record<string, unknown>;
}

/** Writes position and metadata of several characters with one prepared statement (the periodic flush). */
export async function saveCharacters(saves: CharacterSave[]): Promise<void> {
  if (saves.length === 0) return;
  await mysql.prepare(
    "UPDATE ai_core_characters SET pos_x = ?, pos_y = ?, pos_z = ?, pos_h = ?, metadata = ?, last_played = NOW() WHERE id = ?",
    saves.map((s) => [s.position.x, s.position.y, s.position.z, s.position.heading, JSON.stringify(s.metadata), s.id]),
  );
}
