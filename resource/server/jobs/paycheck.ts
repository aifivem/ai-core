import { every, type Job } from "@aicore-fivem/lib/server";
import { jobs as jobDefs, panel, settings } from "../content";
import { log } from "../log";
import { sharedAccounts } from "../money/book";
import { players } from "../player/registry";
import type { Player } from "../player/player";
import { primeTime } from "./primeTime";

/**
 * The salary of one paycheck for a job grade. With `primeTime.enabled`, outside the job's prime time the grade's own
 * `offPrimePayment` replaces the salary, else the salary is multiplied by `offPrimeMultiplier` (floored).
 */
function salaryOf(job: string, grade: number, offPrime: boolean): number {
  const def = jobDefs.get(job)?.grades[grade];
  if (!def) return 0;
  if (!offPrime) return def.salary;
  if (def.offPrimePayment > 0) return def.offPrimePayment;
  return Math.floor(def.salary * settings.primeTime.offPrimeMultiplier);
}

/**
 * Every `paycheck.intervalMinutes`, each character on duty gets its job grade's salary into the paycheck
 * account; with `fromJobAccount` it is paid from the job's own account and skipped when that account is short.
 */
async function payAll(): Promise<void> {
  // One prime time answer per job and run (an alert script's export is asked once per job, not per player).
  const offPrime = new Map<string, boolean>();
  const due: Array<{ player: Player; job: string; salary: number }> = [];
  for (const player of players.all()) {
    const job = player.jobs.onDuty();
    if (!job) continue;
    const grade = player.jobs.grade(job);
    if (grade === null) continue;
    let off = offPrime.get(job);
    if (off === undefined) {
      off = settings.primeTime.enabled && !primeTime.isPrimeTime(job);
      offPrime.set(job, off);
    }
    const salary = salaryOf(job, grade, off);
    if (salary > 0) due.push({ player, job, salary });
  }
  // Job accounts load before anyone is paid; then every payment runs synchronously, for players still loaded and on
  // duty in the same job (nobody is paid after leaving during the wait).
  const funds = new Map<
    string,
    Awaited<ReturnType<typeof sharedAccounts.load>>
  >();
  if (settings.paycheck.fromJobAccount)
    for (const job of new Set(due.map((d) => d.job)))
      funds.set(job, await sharedAccounts.load("job", job));
  for (const { player, job, salary } of due) {
    if (players.get(player.source) !== player) continue;
    if (player.jobs.onDuty() !== job) continue;
    if (settings.paycheck.fromJobAccount) {
      const account = funds.get(job)?.get(settings.paycheck.account);
      if (
        !account ||
        !account.change(-salary, "PAYCHECK_PAID", player.citizenid).ok
      )
        continue;
    }
    player.wallet.change(settings.paycheck.account, salary, "PAYCHECK", job);
  }
}

let job: Job | null = null;
let interval = 0;

/** (Re)starts the paycheck job when the panel's interval changes (0 = no paychecks). */
function schedule(): void {
  if (settings.paycheck.intervalMinutes === interval) return;
  interval = settings.paycheck.intervalMinutes;
  job?.stop();
  job =
    interval > 0
      ? every(
          interval * 60_000,
          () => {
            payAll().catch((error: unknown) =>
              log.error("paycheck failed", error),
            );
          },
          { name: "paycheck" },
        )
      : null;
}
schedule();
panel.onChange("settings", schedule);
