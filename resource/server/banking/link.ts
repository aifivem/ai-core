import type { BankingAdapter, SocietyType } from "@aicore-fivem/shared";
import { gangs, jobs, settings } from "../content";
import { databaseReady } from "../database";
import { log } from "../log";
import { type Account, linkSharedAccounts } from "../money/account";
import { sharedAccounts } from "../money/book";
import { BANK, keyOf, ScriptAccounts } from "./scriptAccounts";

/** Start writes the script refuses (it creates its accounts after it starts) are tried again this often, this many times. */
const RETRY_MS = 3000;
const RETRIES = 10;

/**
 * Keeps ai-core's job and gang `bank` accounts and the active banking script's own accounts together (panel setting
 * `bankAccounts`, `docs/compat/banking.md`). `own`: those ai-core accounts read and change the script's balance (the
 * money layer asks `kept`), ai-core's rows stay untouched. `core`: ai-core keeps the money; every change is written to
 * the script with `set` (one write per account and tick, skipped when the script already shows that balance), every
 * change made in the script comes back through its `watch` and is applied to ai-core. ai-core's own writes are
 * reported back by the script synchronously; `writing` drops them, `known` (the balance the script shows) catches any
 * later echo. On activation ai-core's balance wins.
 */
class SocietyLink extends ScriptAccounts {
  /** Accounts whose writes the script kept refusing (given up until the next activation). */
  private readonly refused = new Set<string>();
  /** The balance the script shows per account, as last written or reported. */
  private readonly known = new Map<string, number>();
  private readonly dirty = new Set<Account>();
  private scheduled = false;
  private writing = false;
  private retries = 0;
  private generation = 0;

  constructor() {
    super();
    linkSharedAccounts({
      balance: (account) => this.keptBalance(account),
      change: (account, delta) => this.keptChange(account, delta),
      changed: (account) => this.changed(account),
    });
  }

  /** A new pick, a restart of the script, a mode change or a new job / gang: links everything again. */
  activate(
    adapter: BankingAdapter | null,
    previous: BankingAdapter | null,
  ): void {
    if (
      previous &&
      previous !== adapter &&
      GetResourceState(previous.resource) === "started"
    )
      this.guard(
        previous,
        "watch",
        () => previous.accounts?.watch?.(null, () => undefined),
        undefined,
      );
    this.adapter = adapter;
    this.generation++;
    this.owned.clear();
    this.refused.clear();
    this.known.clear();
    this.dirty.clear();
    this.retries = 0;
    const accounts = adapter?.accounts;
    if (!adapter || !accounts) return;
    const core = settings.bankAccounts === "core" && accounts.set !== undefined;
    if (accounts.watch) {
      const owners = core
        ? { job: [...jobs.keys()], gang: [...gangs.keys()] }
        : null;
      this.guard(
        adapter,
        "watch",
        () =>
          accounts.watch?.(owners, (t, n, d, b) => this.reported(t, n, d, b)),
        undefined,
      );
    }
    if (!core) return;
    const generation = this.generation;
    const owners = [
      ...[...jobs.keys()].map((name) => ["job", name] as const),
      ...[...gangs.keys()].map((name) => ["gang", name] as const),
    ];
    databaseReady
      .then(() =>
        Promise.all(
          owners.map(([type, name]) => sharedAccounts.load(type, name)),
        ),
      )
      .then((loaded) => {
        if (generation !== this.generation) return;
        for (const list of loaded) {
          const account = list.get(BANK);
          if (account) this.changed(account);
        }
      })
      .catch((error: unknown) =>
        log.error("linking the banking script's accounts failed", error),
      );
  }

  /** `core` mode: ai-core changed one of its accounts; written to the script on the next tick. */
  private changed(account: Account): void {
    if (settings.bankAccounts !== "core" || account.name !== BANK) return;
    if (account.ownerType === "character" || !this.adapter?.accounts?.set)
      return;
    this.dirty.add(account);
    if (this.scheduled) return;
    this.scheduled = true;
    setImmediate(() => this.flush());
  }

  private flush(): void {
    this.scheduled = false;
    const accounts = this.adapter?.accounts;
    const set = accounts?.set;
    const failed: Account[] = [];
    if (accounts && set && settings.bankAccounts === "core")
      for (const account of this.dirty) {
        const type = account.ownerType;
        if (type === "character") continue;
        const name = account.ownerId;
        const key = keyOf(type, name);
        const balance = account.balance;
        if (this.refused.has(key) || this.known.get(key) === balance) continue;
        if (!this.has(accounts, type, name)) continue;
        this.writing = true;
        const done = this.call("set", () => set(type, name, balance), false);
        this.writing = false;
        if (done) this.known.set(key, balance);
        else failed.push(account);
      }
    this.dirty.clear();
    if (failed.length) this.retry(failed);
  }

  /** Writes the script refused: again later (its accounts may not exist yet), given up after `RETRIES`. */
  private retry(failed: Account[]): void {
    if (this.retries >= RETRIES) {
      for (const a of failed) this.refused.add(`${a.ownerType}:${a.ownerId}`);
      log.warn(
        `${this.adapter?.resource}: could not set the balance of ${failed.map((a) => `${a.ownerType} ${a.ownerId}`).join(", ")}`,
      );
      return;
    }
    this.retries++;
    const generation = this.generation;
    setTimeout(() => {
      if (generation !== this.generation) return;
      for (const account of failed) this.changed(account);
    }, RETRY_MS);
  }

  /** `core` mode: a balance change made in the script (its screen, its own exports), applied to ai-core. */
  private reported(
    type: SocietyType,
    name: string,
    delta: number,
    balance: number,
  ): void {
    if (this.writing || settings.bankAccounts !== "core") return;
    this.known.set(keyOf(type, name), balance);
    const account = sharedAccounts.get(type, name, BANK);
    if (!account || delta === 0) return;
    const resource = this.adapter?.resource ?? "banking";
    if (account.change(delta, `banking:${resource}`).ok) return;
    log.warn(
      `${resource}: ${delta} in ${type} ${name} did not fit ai-core's balance; setting it back`,
    );
    this.changed(account);
  }
}

export const societyLink = new SocietyLink();
