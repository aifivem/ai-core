import { fetchNui } from "fivem-nui-react";
import type { AdminPatch, AdminResult } from "@aicore-fivem/shared";
import { NuiCallback } from "../../../../resource/common/nui";
import { mockAdminApply } from "../../dev/adminMock";
import { store } from "../../store";
import { changed, fieldState } from "../../store/admin";
import { getAt, sectionWrite } from "./path";

/** The admin panel's edits: a field's live save and action buttons, through the apply callback. */

const toResult = (value: unknown): AdminResult => {
  if (
    typeof value === "object" &&
    value !== null &&
    (value as { ok?: unknown }).ok === true
  )
    return { ok: true };
  const error =
    typeof value === "object" && value !== null
      ? (value as { error?: unknown }).error
      : undefined;
  return {
    ok: false,
    error: typeof error === "string" ? error : "ADMIN_ERR_BUSY",
  };
};

export async function send(
  resource: string,
  patch: AdminPatch,
): Promise<AdminResult> {
  const answer = await fetchNui<unknown>(
    NuiCallback.adminApply,
    { resource, patch },
    { mockData: mockAdminApply(patch) },
  ).catch(() => null);
  return toResult(answer);
}

export const fieldId = (
  resource: string,
  file: string,
  key: string | undefined,
  path: string,
): string => `${resource}/${file}/${key ?? ""}/${path}`;

/** Live save of one field: shown at once, saved on the server, put back with the error when refused. */
export async function saveField(
  resource: string,
  file: string,
  key: string | undefined,
  path: string,
  value: unknown,
): Promise<void> {
  const panel = store
    .getState()
    .admin.panels.find((p) => p.resource === resource);
  const data = panel?.data[file];
  const record = key === undefined ? data : getAt(data, key);
  if (record === undefined) return;
  const id = fieldId(resource, file, key, path);
  const write = sectionWrite(record, path, value);
  const before = getAt(record, write.section);
  const local = (section: unknown) =>
    store.dispatch(
      changed({
        resource,
        file,
        key,
        value: {
          ...(record as Record<string, unknown>),
          [write.section]: section,
        },
      }),
    );
  local(write.value);
  store.dispatch(fieldState({ id, state: { status: "saving" } }));
  const result = await send(resource, {
    file,
    action: "set",
    key,
    section: write.section,
    value: write.value,
  });
  if (result.ok) {
    store.dispatch(fieldState({ id, state: { status: "saved" } }));
    setTimeout(() => store.dispatch(fieldState({ id, state: null })), 2500);
  } else {
    local(before);
    store.dispatch(
      fieldState({ id, state: { status: "error", error: result.error } }),
    );
  }
}

/** An `action` widget's button: the script's handler runs on the server; the result shows under the button. */
export async function runAction(
  resource: string,
  file: string,
  key: string | undefined,
  id: string,
): Promise<AdminResult> {
  const field = fieldId(resource, file, key, id);
  store.dispatch(fieldState({ id: field, state: { status: "saving" } }));
  const result = await send(resource, { file, action: "run", key, id });
  if (result.ok) {
    store.dispatch(fieldState({ id: field, state: { status: "saved" } }));
    setTimeout(
      () => store.dispatch(fieldState({ id: field, state: null })),
      2500,
    );
  } else
    store.dispatch(
      fieldState({
        id: field,
        state: { status: "error", error: result.error },
      }),
    );
  return result;
}
