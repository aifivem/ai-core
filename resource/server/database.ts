import { createDatabaseTables } from "@aicore-fivem/lib/server";
import { ResourceName } from "common";
import { log } from "./log";

/** Resolves when ai-core's tables exist; every first DB use of a player waits on it. */
export const databaseReady: Promise<void> = createDatabaseTables(ResourceName, "sql/main.sql").catch((error: unknown) => {
  log.error("database setup failed", error);
  throw error;
});
