import { caller } from "@aicore-fivem/lib/server";

/** Argument readers of the money exports. Amounts are whole numbers; `reason` is a short lang key or tag. */

export const positive = (amount: unknown): amount is number =>
  typeof amount === "number" && Number.isSafeInteger(amount) && amount > 0;
export const reasonOf = (reason: unknown): string =>
  typeof reason === "string" && reason ? reason : caller();
