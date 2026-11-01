import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleExclamation,
  faCopy,
  faFileImport,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Switch } from "../../components/ui/switch";
import { Tooltip } from "../../components/ui/tooltip";
import { importRecords } from "./recordActions";

type T = (key: string, ...args: Array<string | number>) => string;
type Records = Record<string, Record<string, unknown>>;

/** Clipboard write that also works in FiveM's CEF (no async clipboard permission there). */
function copyText(text: string): void {
  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  document.execCommand("copy");
  area.remove();
}

/** `{ key: record }` from pasted JSON; null when it is not that shape. */
function parse(text: string): Records | null {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null || Array.isArray(value))
      return null;
    const out: Records = {};
    for (const [key, record] of Object.entries(value)) {
      if (key === "$schema") continue;
      if (
        typeof record !== "object" ||
        record === null ||
        Array.isArray(record)
      )
        return null;
      out[key] = record as Record<string, unknown>;
    }
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

/** Copy every record as JSON (a backup, or for another server's panel). */
export function ExportButton({ records, t }: { records: Records; t: T }) {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip content={t(copied ? "ADMIN_EXPORT_DONE" : "ADMIN_EXPORT")}>
      <Button
        variant="icon"
        aria-label={t("ADMIN_EXPORT")}
        onClick={() => {
          copyText(JSON.stringify(records, null, 2));
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        <FontAwesomeIcon icon={faCopy} aria-hidden />
      </Button>
    </Tooltip>
  );
}

/** Pasted records: new ones are added, ones with a key that exists replace it or are skipped; checked like edits. */
export function ImportDialog({
  open,
  onClose,
  t,
  resource,
  file,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  t: T;
  resource: string;
  file: string;
  existing: Records;
}) {
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = useMemo(() => (text.trim() ? parse(text) : null), [text]);
  const keys = parsed ? Object.keys(parsed) : [];
  const clashing = keys.filter((k) => k in existing);
  const taken = keys.filter((k) => replace || !(k in existing));
  const close = () => {
    setText("");
    setError(null);
    onClose();
  };
  const run = async () => {
    if (!parsed || taken.length === 0) return;
    setBusy(true);
    const result = await importRecords(
      resource,
      file,
      Object.fromEntries(taken.map((k) => [k, parsed[k] ?? {}])),
    );
    setBusy(false);
    if (result.ok) close();
    else setError(t(result.error));
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && close()}
      title={t("ADMIN_IMPORT")}
    >
      <div className="flex w-[64vh] flex-col gap-[1.2vh]">
        <p className="text-[1.35vh] leading-[1.45] text-text-2">
          {t("ADMIN_IMPORT_DESC")}
        </p>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          spellCheck={false}
          placeholder='{ "my_record": { ... } }'
          className="h-[32vh] resize-none rounded-[0.9vh] border border-white/8 bg-row p-[1.2vh] font-mono text-[1.2vh] text-text outline-none focus:border-tgi-green-40"
        />
        {text.trim() && !parsed && (
          <p className="text-[1.3vh] text-danger">{t("ADMIN_IMPORT_BAD")}</p>
        )}
        {parsed && (
          <div className="flex items-center justify-between gap-[1vh] rounded-[0.9vh] bg-row px-[1.2vh] py-[1vh]">
            <span className="text-[1.3vh] text-text-2">
              {t(
                "ADMIN_IMPORT_COUNT",
                keys.length - clashing.length,
                clashing.length,
              )}
            </span>
            {clashing.length > 0 && (
              <label className="flex items-center gap-[0.8vh] text-[1.3vh]">
                {t("ADMIN_IMPORT_REPLACE")}
                <Switch checked={replace} onCheckedChange={setReplace} />
              </label>
            )}
          </div>
        )}
        {error && (
          <p
            role="alert"
            className="flex items-center gap-[0.6vh] rounded-[0.6vh] bg-danger-bg px-[1vh] py-[0.7vh] text-[1.3vh] text-danger"
          >
            <FontAwesomeIcon icon={faCircleExclamation} aria-hidden />
            {error}
          </p>
        )}
        <div className="flex justify-end gap-[0.8vh]">
          <Button variant="ghost" onClick={close}>
            {t("ADMIN_CANCEL")}
          </Button>
          <Button
            variant="primary"
            disabled={busy || taken.length === 0}
            onClick={() => void run()}
          >
            <FontAwesomeIcon
              icon={faFileImport}
              data-icon="inline-start"
              aria-hidden
            />
            {t("ADMIN_IMPORT_RUN", taken.length)}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
