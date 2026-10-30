import { createDatabaseTables } from "@aicore-fivem/lib/server";
import { mysql } from "@aicore-fivem/mysql";
import { ResourceName } from "common";
import { log } from "./log";

// ai-core carries every login (8 queries each): 10 connections take a 10k-player rejoin from 11 s to 8 s (bench/).
mysql.setPoolSize(GetConvarInt("ai_core_pool_size", 10));

/** Resolves when ai-core's tables exist; every first DB use of a player waits on it. */
export const databaseReady: Promise<void> = createDatabaseTables(ResourceName, "sql/main.sql").catch((error: unknown) => {
  log.error("database setup failed", error);
  throw error;
});
