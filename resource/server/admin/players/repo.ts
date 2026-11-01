import { mysql } from "@aicore-fivem/mysql";
import type { CharacterInfo } from "@aicore-fivem/shared";
import type { Position } from "common/adminPlayers";
import { db } from "../../db";

/** SQL of the admin panel's Players section (offline characters; online ones change through their Player). */

export async function characterExists(charId: number): Promise<boolean> {
  const row = await db.first("ai_core_characters", ["deleted_at"], {
    id: charId,
  });
  return row !== null && row.deleted_at === null;
}

export async function userOf(userId: number): Promise<{
  fivem: string;
  license: string | null;
  discord: string | null;
  name: string;
} | null> {
  return db.first("ai_core_users", ["fivem", "license", "discord", "name"], {
    id: userId,
  });
}

/** Stored balances of a character's accounts by name (read only: rows are created when the character loads). */
export async function storedBalances(
  charId: number,
): Promise<Map<string, number>> {
  const rows = await db.select("ai_core_accounts", ["name", "balance"], {
    owner_type: "character",
    owner_id: String(charId),
  });
  return new Map(rows.map((row) => [row.name, Number(row.balance)]));
}

export async function updateInfo(
  charId: number,
  info: Pick<
    CharacterInfo,
    "firstname" | "lastname" | "birthdate" | "sex" | "nationality"
  >,
): Promise<void> {
  // Raw: the typed row has DATE as epoch ms, the column takes `YYYY-MM-DD`.
  await mysql.update(
    "UPDATE ai_core_characters SET firstname = ?, lastname = ?, birthdate = ?, sex = ?, nationality = ? WHERE id = ?",
    [
      info.firstname,
      info.lastname,
      info.birthdate,
      info.sex,
      info.nationality,
      charId,
    ],
  );
}

export async function updateMetadata(
  charId: number,
  metadata: Record<string, unknown>,
): Promise<void> {
  await db.update(
    "ai_core_characters",
    { metadata: JSON.stringify(metadata) },
    { id: charId },
  );
}

export async function updatePosition(
  charId: number,
  p: Position,
): Promise<void> {
  await db.update(
    "ai_core_characters",
    { pos_x: p.x, pos_y: p.y, pos_z: p.z, pos_h: p.heading },
    { id: charId },
  );
}

/** Soft delete (the row stays for logs); false when it was already gone. */
export async function softDelete(charId: number): Promise<boolean> {
  const changed = await mysql.update(
    "UPDATE ai_core_characters SET deleted_at = NOW() WHERE id = ? AND deleted_at IS NULL",
    [charId],
  );
  return (changed ?? 0) > 0;
}

/** The account behind a character (deleted ones too: a ban may follow a deletion). */
export async function accountOfCharacter(charId: number): Promise<{
  fivem: string;
  license: string | null;
  discord: string | null;
  name: string;
} | null> {
  const rows = await mysql.query<
    Array<{
      fivem: string;
      license: string | null;
      discord: string | null;
      name: string;
    }>
  >(
    "SELECT u.fivem, u.license, u.discord, u.name FROM ai_core_characters c JOIN ai_core_users u ON u.id = c.user_id WHERE c.id = ?",
    [charId],
  );
  return rows?.[0] ?? null;
}
