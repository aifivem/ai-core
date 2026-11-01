import { mysql } from "@aicore-fivem/mysql";

/** The periodic save of loaded characters: position and metadata. */

export interface CharacterSave {
  id: number;
  position: { x: number; y: number; z: number; heading: number };
  metadata: Record<string, unknown>;
}

/** Rows per save statement. */
const SAVE_CHUNK = 500;

/**
 * Writes position and metadata of several characters: one `UPDATE ... JOIN` per 500 characters (the periodic flush of
 * 10k online characters is 20 statements, not 10k).
 */
export async function saveCharacters(saves: CharacterSave[]): Promise<void> {
  for (let i = 0; i < saves.length; i += SAVE_CHUNK) {
    const part = saves.slice(i, i + SAVE_CHUNK);
    const rows = part
      .map((_, n) =>
        n === 0
          ? "SELECT ? AS id, ? AS x, ? AS y, ? AS z, ? AS h, ? AS m"
          : "SELECT ?, ?, ?, ?, ?, ?",
      )
      .join(" UNION ALL ");
    await mysql.query(
      `UPDATE ai_core_characters c JOIN (${rows}) v ON c.id = v.id
       SET c.pos_x = v.x, c.pos_y = v.y, c.pos_z = v.z, c.pos_h = v.h, c.metadata = v.m, c.last_played = NOW()`,
      part.flatMap((s) => [
        s.id,
        s.position.x,
        s.position.y,
        s.position.z,
        s.position.heading,
        JSON.stringify(s.metadata),
      ]),
    );
  }
}
