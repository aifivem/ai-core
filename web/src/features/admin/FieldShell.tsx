import { useEffect, useRef, type ReactNode } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleExclamation,
  faCircleNotch,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "../../lib/utils";
import { useAppSelector } from "../../store";
import { clearFocus, fieldId } from "./actions";
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
export function FieldShell({
  path,
  label,
  hint,
  inline = false,
  children,
}: Props) {
  const { resource, file, key, t } = useEditor();
  const id = fieldId(resource, file, key, path);
  // A list shows the state of its rows too (a refused grade name appears under the list).
  const state = useAppSelector(
    (s) =>
      s.admin.fields[id] ??
      Object.entries(s.admin.fields).find(([k]) => k.startsWith(`${id}.`))?.[1],
  );
  const focused = useAppSelector((s) => s.admin.focus === id);
  const ref = useRef<HTMLDivElement>(null);
  // The global search jumped here: bring the field into view and flash it once.
  useEffect(() => {
    if (!focused) return;
    ref.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    const timer = setTimeout(clearFocus, 1800);
    return () => clearTimeout(timer);
  }, [focused]);
  const status = (
    <span className="inline-flex w-[1.4vh] justify-center text-[1.15vh]">
      {state?.status === "saving" && (
        <FontAwesomeIcon
          icon={faCircleNotch}
          spin
          className="text-text-3"
          aria-label={t("ADMIN_SAVING")}
        />
      )}
      {state?.status === "saved" && (
        <FontAwesomeIcon
          icon={faCircleCheck}
          className="text-tgi-green"
          aria-label={t("ADMIN_SAVED")}
        />
      )}
    </span>
  );
  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-[1vh] rounded-[0.8vh] py-[1.3vh] transition-[background-color,box-shadow] duration-300",
        focused &&
          "bg-tgi-green-15 [box-shadow:0_0_0_0.6vh_var(--color-tgi-green-15)]",
      )}
    >
      <div
        className={cn(
          "flex gap-[1.6vh]",
          inline ? "items-center justify-between" : "flex-col gap-[1vh]",
        )}
      >
        {label ? (
          <div className="flex min-w-0 flex-col gap-[0.4vh]">
            <span className="flex items-center gap-[0.8vh] text-[1.45vh] leading-[1.25] font-medium">
              {t(label)}
              {status}
            </span>
            {hint && (
              <span className="text-[1.25vh] leading-[1.4] text-text-3">
                {t(hint)}
              </span>
            )}
          </div>
        ) : (
          // A field without its own label (a list right under its card title) still shows its save state.
          <span className="absolute top-[1.6vh] right-[1.6vh]">{status}</span>
        )}
        <div className={cn(inline ? "shrink-0" : "w-full")}>{children}</div>
      </div>
      {state?.status === "error" && (
        <span
          role="alert"
          className="flex items-center gap-[0.6vh] rounded-[0.6vh] bg-danger-bg px-[1vh] py-[0.7vh] text-[1.3vh] leading-[1.4] text-danger"
        >
          <FontAwesomeIcon icon={faCircleExclamation} aria-hidden />
          {t(state.error)}
        </span>
      )}
    </div>
  );
}
