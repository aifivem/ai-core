import { registerExport } from "@aicore-fivem/lib/server";
import { toCharId } from "../characters/edit";
import { deleteCharacterBy, setCharacterInfo } from "../characters/manage";
import { getCharactersOfUser, getOfflineCharacter } from "../characters/read";
import { answer } from "../characters/answer";
import {
  offlineGang,
  offlineJob,
  offlineMeta,
  offlineMoney,
  offlineRemoveGang,
  offlineRemoveJob,
} from "../characters/writes";
import { membersOf } from "../jobs/members";
import {
  getPlayTime,
  isPaycheckEnabled,
  savePlayer,
  setPaycheckEnabled,
} from "../player/extras";

// Stored characters (loaded ones answer from memory / change through their Player): `characters/`.
registerExport("GetOfflineCharacter", (charId: unknown, done: unknown) => {
  const id = toCharId(charId);
  const work = id === null ? Promise.resolve(null) : getOfflineCharacter(id);
  answer(`character #${id}`, work, done, null);
});
registerExport("GetCharactersOfUser", (user: unknown, done: unknown) =>
  answer("characters of an account", getCharactersOfUser(user), done, []),
);
registerExport(
  "GetJobMembers",
  (job: unknown, done: unknown, after?: unknown, limit?: unknown) =>
    answer("job members", membersOf("job", job, after, limit), done, {
      members: [],
      next: null,
    }),
);
registerExport(
  "GetGangMembers",
  (gang: unknown, done: unknown, after?: unknown, limit?: unknown) =>
    answer("gang members", membersOf("gang", gang, after, limit), done, {
      members: [],
      next: null,
    }),
);
registerExport(
  "AddOfflineMoney",
  (c: unknown, a: unknown, n: unknown, r?: unknown, done?: unknown) =>
    offlineMoney("add", c, a, n, r, done),
);
registerExport(
  "RemoveOfflineMoney",
  (c: unknown, a: unknown, n: unknown, r?: unknown, done?: unknown) =>
    offlineMoney("remove", c, a, n, r, done),
);
registerExport(
  "SetOfflineMoney",
  (c: unknown, a: unknown, n: unknown, r?: unknown, done?: unknown) =>
    offlineMoney("set", c, a, n, r, done),
);
registerExport("SetOfflineJob", offlineJob);
registerExport("RemoveOfflineJob", offlineRemoveJob);
registerExport("SetOfflineGang", offlineGang);
registerExport("RemoveOfflineGang", offlineRemoveGang);
registerExport("SetOfflineMeta", offlineMeta);
registerExport("SetCharacterInfo", setCharacterInfo);
registerExport(
  "DeleteCharacter",
  (charId: unknown, by?: unknown, done?: unknown) =>
    deleteCharacterBy(charId, by, done),
);

// Player extras: `player/extras.ts`.
registerExport("SetPaycheckEnabled", setPaycheckEnabled);
registerExport("IsPaycheckEnabled", isPaycheckEnabled);
registerExport("GetPlayTime", (target: unknown, done?: unknown) =>
  getPlayTime(target, done),
);
registerExport("SavePlayer", (source: unknown, done?: unknown) =>
  savePlayer(source, done),
);
