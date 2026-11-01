import type { AdminResult } from "@aicore-fivem/shared";
import { goTo } from "./actions";
import { send } from "./editActions";

/** Records of a records tab: create (and open it), import pasted ones, delete. */

export async function createRecord(
  resource: string,
  file: string,
  tab: string,
  key: string,
  label: string,
): Promise<AdminResult> {
  const result = await send(resource, { file, action: "create", key, label });
  if (result.ok) goTo(resource, tab, key);
  return result;
}

/** Whole records from a pasted JSON (all or none: one refusal names what is wrong). */
export function importRecords(
  resource: string,
  file: string,
  records: Record<string, Record<string, unknown>>,
): Promise<AdminResult> {
  return send(resource, { file, action: "import", records });
}

export async function deleteRecord(
  resource: string,
  file: string,
  tab: string,
  key: string,
): Promise<AdminResult> {
  const result = await send(resource, { file, action: "delete", key });
  if (result.ok) goTo(resource, tab);
  return result;
}
