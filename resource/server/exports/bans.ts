import { registerExport } from "@aicore-fivem/lib/server";
import { banPlayer, editBan, unbanPlayer } from "../bans/changes";
import { banHistory, findBans, getBans, isBanned } from "../bans/lookup";
import { answer } from "../characters/answer";

// Bans: `bans/`.
registerExport(
  "BanPlayer",
  (
    target: unknown,
    reason: unknown,
    minutes?: unknown,
    by?: unknown,
    done?: unknown,
  ) => banPlayer(target, reason, minutes, by, done),
);
registerExport("UnbanPlayer", (banId: unknown, by?: unknown) =>
  unbanPlayer(banId, by),
);
registerExport("IsBanned", isBanned);
registerExport("GetBans", (page?: unknown) => getBans(page));
registerExport("GetBanHistory", (target: unknown, done: unknown) =>
  answer("ban history", banHistory(target), done, []),
);
registerExport("ListBans", (query: unknown, done: unknown) =>
  answer("ban list", findBans(query), done, null),
);
registerExport("EditBan", (banId: unknown, edit: unknown, by?: unknown) =>
  editBan(banId, edit, by),
);
