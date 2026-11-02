import { GlobalKey, stateString } from "@aifivem/lib/server";
import { fail } from "@aifivem/lib/shared";
import { CORE, type PaycheckMode, type PaycheckWithdrawal } from "@aifivem/shared";
import { panel, settings } from "../content";
import { players } from "../player/registry";
import { officeBalance } from "./paycheck";

/**
 * The paycheck office (panel `paycheck.mode` "office"): salaries wait in metadata `paycheck` until the player takes
 * them out at an office a script runs (ai-banking's NPC). Withdrawing works in both modes, so a balance left from
 * office mode can still be taken out.
 */

/** Export `GetPaycheckMode`: the panel's `paycheck.mode`. */
export const getPaycheckMode = (): PaycheckMode => settings.paycheck.mode;

/** The mode replicated to clients (an office script shows its places only in office mode); written only on a change. */
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
