import { players } from "../../player/registry";

/**
 * The player whose session carries a change for a door script without a server API: the caller's `by` while it is
 * online with a character, else any player with a loaded character (null: nobody can carry it).
 */
export function carrier(by: number | null): number | null {
  if (by !== null && players.get(by)) return by;
  for (const player of players.all()) return player.source;
  return null;
}
