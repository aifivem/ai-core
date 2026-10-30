import { jobs as jobDefs, settings } from "../content";
import { log } from "../log";
import { sharedAccounts } from "../money/book";
import { players } from "../player/registry";
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
    if (salary <= 0) continue;

    if (settings.paycheck.fromJobAccount) {
      const funds = (await sharedAccounts.load("job", job)).get(
        settings.paycheck.account,
      );
      if (
        !funds ||
        !funds.change(-salary, "PAYCHECK_PAID", player.citizenid).ok
      )
        continue;
    }
    player.wallet.change(settings.paycheck.account, salary, "PAYCHECK", job);
  }
}

if (settings.paycheck.intervalMinutes > 0) {
  setInterval(() => {
    payAll().catch((error: unknown) => log.error("paycheck failed", error));
  }, settings.paycheck.intervalMinutes * 60_000);
}
