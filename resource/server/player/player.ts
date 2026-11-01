import {
  patchPlayerData,
  sendPlayerData,
  WriteQueue,
} from "@aicore-fivem/lib/server";
import {
  CORE,
  type AiPlayerData,
  type CharacterInfo,
} from "@aicore-fivem/shared";
import type { CharacterRow } from "../characters/repo";
import type { CharacterSave } from "../characters/save";
import { charWatchers } from "../admin/players/charWatchers";
import { settings } from "../content";
import { GangSet } from "../jobs/gangSet";
import { JobSet, logWriteError } from "../jobs/jobSet";
import { loadGangs, loadJobs } from "../jobs/repo";
import { loadAccounts } from "../money/book";
import type { User } from "./users";
import {
  characterInfo,
  savedArmour,
  savedHealth,
  savedLastDuty,
  savedPlayTime,
  type InfoEdit,
} from "./rowValues";
import { Wallet } from "./wallet";

/** A player with a loaded character: everything ai-core knows about them, in memory. */
export class Player {
  /** Runtime switch of a script (`SetPaycheckEnabled`); every load starts paid. */
  paycheck = true;
  /** Epoch ms up to which play time is counted into metadata `playtime`. */
  private counted = Date.now();

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
    const lastDuty = savedLastDuty(row.metadata);
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
    return characterInfo(this.row);
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
    charWatchers.meta(this.row.id, key, value ?? null);
    patchPlayerData(this.source, "metadata", { [key]: value ?? null });
    emit(CORE.metaChangedEvent, this.source, key, value ?? null);
  }

  /** A copy of the whole metadata bag (the admin panel's snapshot). */
  metadata(): Record<string, unknown> {
    return { ...this.row.metadata };
  }

  /** Name, birth date and nationality from the admin panel (the caller writes the row); scripts that copied them see the change after the next load. */
  setInfo(info: InfoEdit): void {
    this.row.firstname = info.firstname;
    this.row.lastname = info.lastname;
    this.row.birthdate = info.birthdate;
    this.row.nationality = info.nationality;
    sendPlayerData(this.source, "character", this.info());
    charWatchers.char(this.row.id, info);
  }

  /** The full snapshot for the owner's client. */
  snapshot(): AiPlayerData {
    return {
      character: this.info(),
      money: this.wallet.snapshot(),
      jobs: this.jobs.all(),
      duty: this.jobs.onDuty(),
      job: this.jobs.current(),
      gangs: this.gangs.all(),
      activeGang: this.gangs.activeGang(),
      metadata: this.metadata(),
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

  /** Saved body armour (metadata `armor`, QB's key), 0-100; set again on the ped at spawn. */
  armour(): number {
    return savedArmour(this.row.metadata);
  }

  /** Saved ped health (metadata `health`), set again at spawn; 0 when none is saved or it is 100 or below. */
  health(): number {
    return savedHealth(this.row.metadata);
  }

  /** Seconds played: the stored metadata `playtime` plus the time since it was last counted. */
  playTime(): number {
    const unsaved = Math.floor((Date.now() - this.counted) / 1000);
    return savedPlayTime(this.row.metadata) + unsaved;
  }

  /** What the periodic flush writes: the ped's position, armour and health (server copies), play time and the metadata bag. */
  saveData(): CharacterSave {
    const seconds = Math.floor((Date.now() - this.counted) / 1000);
    if (seconds > 0) {
      this.counted += seconds * 1000;
      this.setMeta("playtime", savedPlayTime(this.row.metadata) + seconds);
    }
    const ped = GetPlayerPed(String(this.source));
    if (ped && DoesEntityExist(ped)) {
      const [x = 0, y = 0, z = 0] = GetEntityCoords(ped);
      this.row.position = { x, y, z, heading: GetEntityHeading(ped) };
      const armour = GetPedArmour(ped);
      if (armour !== this.row.metadata.armor) this.setMeta("armor", armour);
      const health = GetEntityHealth(ped);
      if (health !== this.row.metadata.health) this.setMeta("health", health);
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
