import { sendPlayerData, WriteQueue } from "@aicore-fivem/lib/server";
import type { AiPlayerData, CharacterInfo } from "@aicore-fivem/shared";
import type { CharacterRow, CharacterSave } from "../characters/repo";
import { playerWatchers } from "../admin/players/watchers";
import { settings } from "../content";
import { GangSet } from "../jobs/gangSet";
import { JobSet, logWriteError } from "../jobs/jobSet";
import { loadGangs, loadJobs } from "../jobs/repo";
import { loadAccounts } from "../money/book";
import type { User } from "./users";
import { Wallet } from "./wallet";

/** A player with a loaded character: everything ai-core knows about them, in memory. */
export class Player {
  private constructor(
    readonly source: number,
    readonly user: User,
    private readonly row: CharacterRow,
    readonly wallet: Wallet,
    readonly jobs: JobSet,
    readonly gangs: GangSet,
    /** Membership writes of this character, in order. */
    readonly writes: WriteQueue,
  ) {}

  /** Loads a character's accounts, jobs and gangs. Duty starts off unless the restore setting is on. */
  static async load(
    source: number,
    user: User,
    row: CharacterRow,
  ): Promise<Player> {
    const [accounts, jobList, gangData] = await Promise.all([
      loadAccounts("character", String(row.id)),
      loadJobs(row.id),
      loadGangs(row.id),
    ]);
    const lastDuty =
      typeof row.metadata.lastDutyJob === "string"
        ? row.metadata.lastDutyJob
        : null;
    const writes = new WriteQueue(logWriteError);
    const player = new Player(
      source,
      user,
      row,
      new Wallet(source, accounts),
      new JobSet(source, row.id, jobList, writes, lastDuty),
      new GangSet(source, row.id, gangData.gangs, writes, gangData.active),
      writes,
    );
    if (settings.jobs.restoreDuty && lastDuty) player.jobs.setDuty(lastDuty);
    return player;
  }

  get charId(): number {
    return this.row.id;
  }

  get citizenid(): string {
    return this.row.citizenid;
  }

  info(): CharacterInfo {
    const { id, citizenid, slot, firstname, lastname, birthdate, sex } =
      this.row;
    return { id, citizenid, slot, firstname, lastname, birthdate, sex };
  }

  get fullName(): string {
    return `${this.row.firstname} ${this.row.lastname}`;
  }

  /** Where the character spawns: last saved position, or the default spawn for a new one. */
  spawnPosition(): { x: number; y: number; z: number; heading: number } {
    return this.row.position ?? settings.spawn.default;
  }

  getMeta(key: string): unknown {
    return this.row.metadata[key];
  }

  /** Free-form per-character bag (bridges keep framework metadata here); saved with the periodic flush. */
  setMeta(key: string, value: unknown): void {
    if (value === undefined || value === null) delete this.row.metadata[key];
    else this.row.metadata[key] = value;
    playerWatchers.meta(this.row.id, key, value ?? null);
  }

  /** A copy of the whole metadata bag (the admin panel's snapshot). */
  metadata(): Record<string, unknown> {
    return { ...this.row.metadata };
  }

  /** Name and birth date from the admin panel (the caller writes the row); scripts that copied them see the change after the next load. */
  setInfo(
    info: Pick<CharacterInfo, "firstname" | "lastname" | "birthdate">,
  ): void {
    this.row.firstname = info.firstname;
    this.row.lastname = info.lastname;
    this.row.birthdate = info.birthdate;
    sendPlayerData(this.source, "character", this.info());
    playerWatchers.char(this.row.id, info);
  }

  /** The full snapshot for the owner's client. */
  snapshot(): AiPlayerData {
    return {
      character: this.info(),
      money: this.wallet.snapshot(),
      jobs: this.jobs.all(),
      duty: this.jobs.onDuty(),
      gangs: this.gangs.all(),
      activeGang: this.gangs.activeGang(),
    };
  }

  sendSnapshot(): void {
    for (const [key, value] of Object.entries(this.snapshot()) as [
      keyof AiPlayerData,
      never,
    ][]) {
      sendPlayerData(this.source, key, value);
    }
  }

  /** What the periodic flush writes: the ped's position (server copy) and the metadata bag. */
  saveData(): CharacterSave {
    const ped = GetPlayerPed(String(this.source));
    if (ped && DoesEntityExist(ped)) {
      const [x = 0, y = 0, z = 0] = GetEntityCoords(ped);
      this.row.position = { x, y, z, heading: GetEntityHeading(ped) };
    }
    const lastDuty = this.jobs.last();
    if (lastDuty !== this.row.metadata.lastDutyJob)
      this.setMeta("lastDutyJob", lastDuty);
    return {
      id: this.row.id,
      position: this.spawnPosition(),
      metadata: this.row.metadata,
    };
  }

  /** Drops runtime traces (duty counts, ACL principals); the caller saves first. */
  release(): void {
    this.jobs.release();
    this.gangs.release();
  }

  /** Resolves when every queued write of this character (money, memberships) is in the DB. */
  async idle(): Promise<void> {
    await Promise.all([this.wallet.idle(), this.writes.idle()]);
  }
}
