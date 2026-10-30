import { sendPlayerData, type WriteQueue } from "@aicore-fivem/lib/server";
import { CORE, type GangMembership } from "@aicore-fivem/shared";
import { gangs as gangDefs, settings } from "../content";
import { addMembership, removeMembership } from "./principals";
import { deleteGang, saveActiveGang, saveGang } from "./repo";

export type GangChange =
  | { ok: true }
  | {
      ok: false;
      error: "UNKNOWN_GANG" | "INVALID_GRADE" | "LIMIT" | "NOT_MEMBER";
    };

/**
 * A loaded character's gangs: the same rules as jobs (multi-gang switch, `maxGangs`), with one active gang
 * instead of duty. The active gang is what other players and gang scripts see; it is saved with the character.
 */
export class GangSet {
  constructor(
    private readonly source: number,
    private readonly charId: number,
    private readonly list: GangMembership[],
    private readonly writes: WriteQueue,
    private active: string | null,
  ) {
    for (const m of list) addMembership(source, "gang", m.gang, m.grade);
    if (active && !list.some((m) => m.gang === active)) this.active = null;
  }

  all(): GangMembership[] {
    return this.list.map((m) => ({ ...m }));
  }

  grade(gang: string): number | null {
    return this.list.find((m) => m.gang === gang)?.grade ?? null;
  }

  activeGang(): string | null {
    return this.active;
  }

  set(gang: string, grade: number): GangChange {
    const def = gangDefs.get(gang);
    if (!def) return { ok: false, error: "UNKNOWN_GANG" };
    if (!Number.isInteger(grade) || grade < 0 || grade >= def.grades.length)
      return { ok: false, error: "INVALID_GRADE" };
    const existing = this.list.find((m) => m.gang === gang);
    if (existing) {
      removeMembership(this.source, "gang", gang, existing.grade);
      existing.grade = grade;
    } else {
      if (!settings.gangs.multiGang)
        for (const other of this.list.map((m) => m.gang)) this.remove(other);
      else if (this.list.length >= settings.gangs.maxGangs)
        return { ok: false, error: "LIMIT" };
      this.list.push({ gang, grade });
    }
    addMembership(this.source, "gang", gang, grade);
    this.writes.push(`gang ${this.charId} ${gang}`, () =>
      saveGang(this.charId, gang, grade),
    );
    this.pushGangs();
    if (!this.active) this.setActive(gang);
    return { ok: true };
  }

  remove(gang: string): GangChange {
    const index = this.list.findIndex((m) => m.gang === gang);
    const member = this.list[index];
    if (!member) return { ok: false, error: "NOT_MEMBER" };
    this.list.splice(index, 1);
    removeMembership(this.source, "gang", gang, member.grade);
    this.writes.push(`gang ${this.charId} -${gang}`, () =>
      deleteGang(this.charId, gang),
    );
    this.pushGangs();
    if (this.active === gang) this.setActive(this.list[0]?.gang ?? null);
    return { ok: true };
  }

  /** Makes `gang` the active one (deactivating any other), or none with null. */
  setActive(gang: string | null): GangChange {
    if (gang !== null && !this.list.some((m) => m.gang === gang))
      return { ok: false, error: "NOT_MEMBER" };
    if (gang === this.active) return { ok: true };
    this.active = gang;
    this.writes.push(`gang ${this.charId} active`, () =>
      saveActiveGang(this.charId, gang),
    );
    sendPlayerData(this.source, "activeGang", gang);
    emit(CORE.activeGangChangedEvent, this.source, gang);
    return { ok: true };
  }

  release(): void {
    for (const m of this.list)
      removeMembership(this.source, "gang", m.gang, m.grade);
  }

  private pushGangs(): void {
    const list = this.all();
    sendPlayerData(this.source, "gangs", list);
    emit(CORE.gangsChangedEvent, this.source, list);
  }
}
