import { every, onStop } from "@aicore-fivem/lib/server";
import { saveCharacters } from "./characters/repo";
import { settings } from "./content";
import { log } from "./log";
import { players } from "./player/registry";
import { sharedAccounts } from "./money/book";

/** Writes position and metadata of every online character (money and memberships are written as they change). */
export async function saveAll(): Promise<void> {
  await saveCharacters([...players.all()].map((player) => player.saveData()));
}

/** Resolves when every queued money and membership write is in the DB. */
async function drainWrites(): Promise<void> {
  await Promise.all([
    ...[...players.all()].map((player) => player.idle()),
    ...sharedAccounts.all().map((account) => account.idle()),
  ]);
}

function saveNow(why: string): void {
  saveAll()
    .then(drainWrites)
    .then(() => log.info(`saved ${players.size} characters (${why})`))
    .catch((error: unknown) => log.error(`save failed (${why})`, error));
}

every(settings.saveIntervalMinutes * 60_000, () => saveNow("interval"), {
  name: "save",
});

on("txAdmin:events:serverShuttingDown", () => saveNow("shutdown"));

onStop(() => saveNow("resource stop"));
