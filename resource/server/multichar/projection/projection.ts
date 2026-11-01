import { PlayerMap } from "@aicore-fivem/lib/server";
import type { UnloadReason } from "@aicore-fivem/shared";
import { jobs as jobDefs, settings } from "../../content";
import { databaseReady } from "../../database";
import { log } from "../../log";
import { players, selecting } from "../../player/registry";
import { externalScreen, multicharInstalled } from "../screen";
import { BATCH_ACCOUNTS, take } from "./batch";
import {
  createTable,
  dropTables,
  inspect,
  PROJECTION_TABLES,
  type ProjectionTable,
} from "./ddl";
import { noticeDeletes } from "./deletes";
import { stateOf, type CharacterState } from "./read";
import { holders, writeAccounts, writeJobs } from "./write";

/**
 * The ESX / QB framework tables external multichars read (`docs/compat/multichar.md`). They hold only the characters
 * of connected accounts: rebuilt per account on connect, load, unload, create and delete, removed on leave; jobs on
 * panel edits. All work runs one step at a time in one chain; account changes are collected and written in batches.
 * Each batch first announces the characters the delete trigger soft-deleted for its accounts (a multichar's delete is
 * followed by a load, a create or a leave of that account, all refresh points); enabling and disabling read the
 * whole log once.
 */
class Projection {
  /** Tables exist and are fed; changed only inside the chain. */
  private on = false;
  private settled = false;
  private booting = true;
  private owned = new Set<ProjectionTable>();
  /** Starts after the tables exist (the screen picker switches before `createDatabaseTables` is done). */
  private chain: Promise<void> = databaseReady.catch(() => undefined);
  private scheduled = false;
  private readonly dirty = new Set<number>();
  private readonly gone = new Set<number>();
  private readonly jobNames = new Set<string>();
  /** `jobs:<name>` / `gangs:<name>`: definitions whose holders' QB rows show a label or grade name. */
  private readonly members = new Set<string>();
  /** A character just unloaded, read before its save (the flush may run before the save lands). */
  private readonly captured = new Map<number, CharacterState>();
  /** Connected accounts that have rows (source -> account id). */
  private readonly accounts = new PlayerMap<number>({
    onDrop: (_source, userId) => this.forget(userId),
  });

  /** Whether the tables should exist now. */
  active(): boolean {
    const mode = settings.frameworkTables;
    if (mode !== "auto") return mode === "on";
    return externalScreen() !== null || (this.booting && multicharInstalled());
  }

  /** A player's account is known (joined, loaded): its rows are built. */
  connected(source: number, userId: number): void {
    this.accounts.set(source, userId);
    this.refresh(userId);
  }

  unloaded(source: number, charId: number, reason: UnloadReason): void {
    const player = players.get(source);
    if (reason !== "switch" || !player) return;
    this.captured.set(charId, stateOf(player));
    this.refresh(player.user.id);
  }

  /** A character of an account was deleted: rebuilt only when the account is connected (only those have rows). */
  deleted(userId: number): void {
    for (const other of this.accounts.values())
      if (other === userId) return this.refresh(userId);
  }

  definitionChanged(file: string, name: string): void {
    if (file !== "jobs" && file !== "gangs") return;
    if (file === "jobs") this.jobNames.add(name);
    this.members.add(`${file}:${name}`);
    this.schedule();
  }

  /** Compares the wanted state with the tables, in the chain (settings, screen switch, start). */
  reconcile(): void {
    this.run(async () => {
      const want = this.active();
      if (this.settled && want === this.on) return;
      this.settled = true;
      if (want) await this.enable();
      else await this.disable();
    });
  }

  endBoot(): void {
    this.booting = false;
    this.reconcile();
  }

  private refresh(userId: number): void {
    this.gone.delete(userId);
    this.dirty.add(userId);
    this.schedule();
  }

  private forget(userId: number): void {
    for (const other of this.accounts.values()) if (other === userId) return;
    this.dirty.delete(userId);
    this.gone.add(userId);
    this.schedule();
  }

  private run(work: () => Promise<void>): void {
    this.chain = this.chain
      .then(work)
      .catch((error: unknown) => log.error("framework tables", error));
  }

  private schedule(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    this.run(() => this.flush());
  }

  private async enable(): Promise<void> {
    const { ours, foreign } = await inspect();
    if (foreign.size > 0)
      log.warn(
        `framework tables ${[...foreign].join(", ")} exist and are not ai-core's (a server moved from QB / ESX): ai-core never writes them; the external character screen reads what is in them`,
      );
    await dropTables(ours);
    await noticeDeletes(null);
    const made = new Set<ProjectionTable>();
    for (const table of PROJECTION_TABLES) {
      if (foreign.has(table)) continue;
      const failed = await createTable(table);
      made.add(table);
      if (failed !== null)
        log.warn(
          `no delete trigger on ${table}: a character deleted through it stays in ai-core`,
          failed,
        );
    }
    this.owned = made;
    this.on = true;
    for (const name of jobDefs.keys()) this.jobNames.add(name);
    for (const userId of this.accounts.values()) this.dirty.add(userId);
    for (const user of selecting.values()) this.dirty.add(user.id);
    for (const player of players.all()) this.dirty.add(player.user.id);
    log.info(`framework tables on: ${[...made].join(", ")}`);
    this.schedule();
  }

  private async disable(): Promise<void> {
    const { ours } = await inspect();
    await dropTables(ours);
    await noticeDeletes(null);
    if (this.on || ours.size > 0)
      log.info(`framework tables off: ${[...ours].join(", ") || "none"}`);
    this.on = false;
    this.owned.clear();
  }

  private async flush(): Promise<void> {
    this.scheduled = false;
    if (!this.on) {
      for (const set of [this.dirty, this.gone, this.jobNames, this.members])
        set.clear();
      this.captured.clear();
      return;
    }
    const live = (charId: number): CharacterState | undefined => {
      const player = players.byCharacter(charId);
      return player ? stateOf(player) : this.captured.get(charId);
    };
    while (
      this.jobNames.size +
        this.members.size +
        this.dirty.size +
        this.gone.size >
      0
    ) {
      if (this.jobNames.size > 0)
        await writeJobs(take(this.jobNames), this.owned);
      if (this.members.size > 0)
        for (const userId of await holders(take(this.members), this.owned))
          this.dirty.add(userId);
      const ids = take(this.dirty, BATCH_ACCOUNTS);
      const removed = take(this.gone, BATCH_ACCOUNTS * 10);
      if (ids.length + removed.length > 0) {
        await noticeDeletes([...ids, ...removed]);
        await writeAccounts(ids, removed, this.owned, live);
      }
    }
    this.captured.clear();
  }
}

export const projection = new Projection();
