import {
  GlobalKey,
  isNear,
  notify,
  onClientCallback,
  stateString,
} from "@aifivem/lib/server";
import {
  type ActionResult,
  fail,
  groupDigits,
  oneArg,
  readInt,
  readText,
} from "@aifivem/lib/shared";
import {
  CORE,
  type PaycheckMode,
  type PaycheckWithdrawal,
} from "@aifivem/shared";
import { Locale } from "common";
import { PAYCHECK_OFFICE, readPaycheckOffice } from "common/paycheckOffice";
import { panel, settings } from "../content";
import { players } from "../player/registry";
import { officeBalance } from "./paycheck";

/**
 * The paycheck office (panel `paycheck.mode` "office"): salaries wait in metadata `paycheck` until the player takes
 * them out at one of the panel's offices (`data/paycheckOffices.json`). The exports withdraw in both modes, so a
 * balance left from office mode can still be paid out by a script.
 */

/** Export `GetPaycheckMode`: the panel's `paycheck.mode`. */
export const getPaycheckMode = (): PaycheckMode => settings.paycheck.mode;

/** The mode replicated to clients (the office points show only in office mode); written only on a change. */
const modeKey = new GlobalKey(CORE.paycheckModeStateKey, stateString);
const publishMode = () => {
  if (modeKey.get() !== settings.paycheck.mode)
    modeKey.set(settings.paycheck.mode);
};
publishMode();
panel.onChange("settings", publishMode);

export function getPaycheckBalance(source: unknown): number {
  const player = typeof source === "number" ? players.get(source) : undefined;
  return player ? officeBalance(player) : 0;
}

/** Pays `amount` (left out = everything) of the office balance into the pay account; both changes are synchronous. */
export function withdrawPaycheck(
  source: unknown,
  amount?: unknown,
): PaycheckWithdrawal {
  const player = typeof source === "number" ? players.get(source) : undefined;
  if (!player) return fail("CORE_ERR_ARGS");
  const balance = officeBalance(player);
  if (balance <= 0) return fail("PAYCHECK_ERR_EMPTY");
  const take = amount == null ? balance : amount;
  if (
    typeof take !== "number" ||
    !Number.isSafeInteger(take) ||
    take < 1 ||
    take > balance
  )
    return fail("PAYCHECK_ERR_AMOUNT");
  const paid = player.wallet.change(
    settings.paycheck.account,
    take,
    "PAYCHECK_WITHDRAW",
  );
  if (!paid.ok) return fail("PAYCHECK_ERR_ACCOUNT");
  player.setMeta("paycheck", balance - take);
  return { ok: true, amount: take, balance: balance - take };
}

/** The office places, one record re-read per panel edit. */
const offices = panel.records(PAYCHECK_OFFICE.file, readPaycheckOffice);

/** Why the player cannot use this office now (account mode, unknown office, away from its counter), else null. */
function officeRefusal(source: number, id: string): string | null {
  if (settings.paycheck.mode !== "office") return "PAYCHECK_ERR_CLOSED";
  const office = offices.get(id);
  return office && isNear(source, office, office.radius + 2)
    ? null
    : "PAYCHECK_ERR_FAR";
}

onClientCallback(
  PAYCHECK_OFFICE.balanceCallback,
  {
    args: oneArg((v) => readText(v, 64)),
    rate: { count: 4, windowMs: 2000 },
  },
  (source, id): ActionResult<{ balance: number }> => {
    const refusal = officeRefusal(source, id);
    return refusal
      ? fail(refusal)
      : { ok: true, balance: getPaycheckBalance(source) };
  },
);

onClientCallback(
  PAYCHECK_OFFICE.withdrawCallback,
  {
    args: ([id, amount]) => {
      const office = readText(id, 64);
      const value = amount == null ? null : readInt(amount, 1, 100_000_000);
      return office === null || (amount != null && value === null)
        ? null
        : ([office, value] as const);
    },
    lock: true,
  },
  (source, id, amount): ActionResult => {
    const refusal = officeRefusal(source, id);
    if (refusal) return fail(refusal);
    const result = withdrawPaycheck(source, amount ?? undefined);
    if (!result.ok) return result;
    notify(
      source,
      Locale("PAYCHECK_COLLECTED", groupDigits(result.amount)),
      "success",
    );
    return { ok: true };
  },
);
