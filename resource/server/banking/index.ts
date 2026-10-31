import { registerExport } from "@aicore-fivem/lib/server";
import type { BankingAdapter } from "@aicore-fivem/shared";
import { AdapterPicker } from "common/adapters";
import { jobs, panel, settings } from "../content";
import { log } from "../log";
import { sharedAccounts } from "../money/book";
import { players } from "../player/registry";
import { BANKING_SYSTEMS } from "./registry";

/**
 * ai-core's banking layer (lib `banking`): ai-core owns every balance (job accounts included); a banking script is
 * opened and its own society balance read for display. Money that lands in a banking script's own society account
 * (paid there by another script) is moved into ai-core's job `bank` account when the script reports it, so ai-core
 * stays the one place job money lives. Picked by the panel setting `banking` (`auto` = first running).
 */
const banking = new AdapterPicker({
  category: "banking",
  adapters: BANKING_SYSTEMS,
  log,
  choice: settings.banking,
  noneText: "no banking script runs: job money stays in ai-core only",
  onSwitch: (next) => watch(next),
});
panel.onChange("settings", () => banking.setChoice(settings.banking));
// A job added in the panel gets its deposits watched too.
panel.onChange("jobs", (key, value) => {
  if (key !== undefined && value !== null) watch(banking.active);
});

function watch(adapter: BankingAdapter | null): void {
  if (!adapter?.watchDeposits) return;
  adapter.watchDeposits([...jobs.keys()], (job, amount) =>
    // Out of the script's hook: its own money call must finish before we take.
    setImmediate(() => forward(adapter, job, amount)),
  );
}

/** Moves money a banking script took into its own job account over to ai-core's job account. */
function forward(adapter: BankingAdapter, job: string, amount: number): void {
  if (banking.active !== adapter || amount <= 0) return;
  const account = sharedAccounts.get("job", job, "bank");
  if (!account) return;
  if (!banking.call("take", (a) => a.take?.(job, amount) ?? false, false))
    return log.warn(
      `${adapter.resource}: could not move ${amount} of ${job} into ai-core`,
    );
  if (!account.change(amount, `banking:${adapter.resource}`).ok)
    log.error(`${adapter.resource}: ${amount} taken from ${job} but not added`);
}

registerExport("GetBankingSystem", () => banking.active?.resource ?? null);
registerExport(
  "OpenBank",
  (source: unknown) =>
    typeof source === "number" &&
    players.get(source) !== undefined &&
    banking.call("open", (a) => a.open?.(source) ?? false, false),
);
registerExport("GetBankSocietyBalance", (job: unknown) =>
  typeof job === "string"
    ? banking.call("societyBalance", (a) => a.societyBalance(job), null)
    : null,
);
