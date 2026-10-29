import type { ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck, faCircleExclamation, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { fieldId } from "./actions";
import { useEditor } from "./context";

interface Props {
  path: string;
  label: string;
  hint?: string;
  /** Label left, control right (switches, numbers, selects); else the control sits under the label. */
  inline?: boolean;
  children: ReactNode;
}

/** Label, hint, the field's save state (saving, saved, refused with the reason) and its control. */
export function FieldShell({ path, label, hint, inline = false, children }: Props) {
  const { resource, file, key, t } = useEditor();
  const id = fieldId(resource, file, key, path);
  // A list shows the state of its rows too (a refused grade name appears under the list).
  const state = useAppSelector((s) => s.admin.fields[id] ?? Object.entries(s.admin.fields).find(([k]) => k.startsWith(`${id}.`))?.[1]);
  const status = (
    <span className="inline-flex w-[1.4vh] justify-center text-[1.15vh]">
      {state?.status === "saving" && <FontAwesomeIcon icon={faSpinner} spin className="text-text-3" aria-label={t("ADMIN_SAVING")} />}
      {state?.status === "saved" && <FontAwesomeIcon icon={faCircleCheck} className="text-accent" aria-label={t("ADMIN_SAVED")} />}
    </span>
  );
  return (
    <div className="flex flex-col gap-[0.6vh]">
      <div className={cn("flex gap-[1.6vh]", inline ? "items-center justify-between" : "flex-col gap-[0.6vh]")}>
        {label ? (
          <div className="flex min-w-0 flex-col gap-[0.2vh]">
            <span className="flex items-center gap-[0.6vh] text-[1.35vh] font-medium text-text">
              {t(label)}
              {status}
            </span>
            {hint && <span className="text-[1.2vh] leading-[1.4] text-text-3">{t(hint)}</span>}
          </div>
        ) : (
          // A field without its own label (a list right under its card title) still shows its save state.
          <span className="absolute right-[1.8vh] top-[1.8vh]">{status}</span>
        )}
        <div className={cn(inline ? "shrink-0" : "w-full")}>{children}</div>
      </div>
      {state?.status === "error" && (
        <span role="alert" className="flex items-center gap-[0.6vh] rounded-[0.6vh] bg-[rgba(var(--danger-rgb),0.1)] px-[1vh] py-[0.6vh] text-[1.25vh] text-danger">
          <FontAwesomeIcon icon={faCircleExclamation} aria-hidden />
          {t(state.error)}
        </span>
      )}
    </div>
  );
}
