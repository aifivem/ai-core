import { mysql } from "@aicore-fivem/mysql";
import type { AppearanceAdapter } from "@aicore-fivem/shared";

/** ai-appearance: one `Appearance` JSON per character in its own table (`model` = the freemode model name). */
export const aiAppearance: AppearanceAdapter = {
  resource: "ai-appearance",
  load: async (charId) => {
    const row = await mysql.single<{ model: string; data: string }>(
      "SELECT model, data FROM ai_appearance_characters WHERE char_id = ?",
      [charId],
    );
    if (!row || typeof row.model !== "string") return null;
    return { model: GetHashKey(row.model), data: JSON.parse(row.data) };
  },
};
