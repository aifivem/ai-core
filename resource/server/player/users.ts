import { mysql } from "@aicore-fivem/mysql";

/** The account behind a connection: the FiveM id is the key (owner decision), other identifiers ride along. */
export interface Identity {
  fivem: string;
  license: string | null;
  discord: string | null;
  name: string;
}

function identifier(source: number, type: string): string | null {
  const value = GetPlayerIdentifierByType(String(source), type);
  return value ? value.slice(type.length + 1) : null;
}

/** The connection's identity, or null without a FiveM account. */
export function identify(source: number): Identity | null {
  const fivem = identifier(source, "fivem");
  if (!fivem) return null;
  return {
    fivem,
    license: identifier(source, "license"),
    discord: identifier(source, "discord"),
    name: (GetPlayerName(String(source)) || "").slice(0, 64),
  };
}

export interface User {
  id: number;
  fivem: string;
  license: string | null;
  charSlots: number | null;
}

/** Creates or refreshes the account row and returns it. */
export async function upsertUser(identity: Identity): Promise<User> {
  await mysql.query(
    `INSERT INTO ai_core_users (fivem, license, discord, name) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE license = VALUES(license), discord = VALUES(discord), name = VALUES(name), last_seen = NOW()`,
    [identity.fivem, identity.license, identity.discord, identity.name],
  );
  const row = await mysql.single<{ id: number; char_slots: number | null }>(
    "SELECT id, char_slots FROM ai_core_users WHERE fivem = ?",
    [identity.fivem],
  );
  if (!row) throw new Error(`user row missing after upsert (fivem:${identity.fivem})`);
  return { id: row.id, fivem: identity.fivem, license: identity.license, charSlots: row.char_slots };
}
