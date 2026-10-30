import { jobs as jobDefs, settings } from "../content";
import { log } from "../log";
import { sharedAccounts } from "../money/book";
import { players } from "../player/registry";

/**
 * Every `paycheck.intervalMinutes`, each character on duty gets its job grade's salary into the paycheck
 * account; with `fromJobAccount` it is paid from the job's own account and skipped when that account is short.
 */
async function payAll(): Promise<void> {
  for (const player of players.all()) {
    const job = player.jobs.onDuty();
    if (!job) continue;
    const grade = player.jobs.grade(job);
    const salary =
      grade === null ? 0 : (jobDefs.get(job)?.grades[grade]?.salary ?? 0);
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
