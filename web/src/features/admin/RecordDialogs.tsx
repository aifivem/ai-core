import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../components/ui/button";
import { Dialog } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { createRecord, deleteRecord } from "./actions";

type T = (key: string, ...args: Array<string | number>) => string;

/** "Police Department" -> "police_department": the key a new record gets from its name. */
const keyFrom = (name: string): string =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <p role="alert" className="flex items-center gap-[0.6vh] text-[1.3vh] text-danger">
      <FontAwesomeIcon icon={faCircleExclamation} aria-hidden />
      {text}
    </p>
  );
}

interface CreateProps {
  open: boolean;
  onClose: () => void;
  t: T;
  title: string;
  resource: string;
  file: string;
  tab: string;
}

/** A new record: the name players see, and the key it is saved under (made from the name, editable). */
export function CreateDialog({ open, onClose, t, title, resource, file, tab }: CreateProps) {
  const [name, setName] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const finalKey = key ?? keyFrom(name);
  const reset = () => {
    setName("");
    setKey(null);
    setError(null);
    onClose();
  };
  const submit = async () => {
    if (!name.trim() || finalKey.length < 2) return setError(t("ADMIN_ERR_NAME"));
    setBusy(true);
    const result = await createRecord(resource, file, tab, finalKey, name.trim());
    setBusy(false);
    if (result.ok) reset();
    else setError(t(result.error));
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !next && reset()} title={title} description={t("ADMIN_CREATE_DESC")}>
      <label className="flex flex-col gap-[0.6vh]">
        <span className="text-[1.3vh] font-medium">{t("ADMIN_F_NAME")}</span>
        <Input autoFocus value={name} placeholder={t("ADMIN_PH_NAME")} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void submit()} />
      </label>
      <label className="flex flex-col gap-[0.6vh]">
        <span className="text-[1.3vh] font-medium">{t("ADMIN_F_KEY")}</span>
        <Input className="font-mono" value={finalKey} placeholder={t("ADMIN_PH_KEY")} onChange={(e) => setKey(e.target.value.toLowerCase())} />
        <span className="text-[1.2vh] text-text-3">{t("ADMIN_H_KEY")}</span>
      </label>
      <ErrorLine text={error} />
      <div className="flex justify-end gap-[0.8vh] pt-[0.4vh]">
        <Button variant="secondary" onClick={reset}>
          {t("ADMIN_CANCEL")}
        </Button>
        <Button variant="filled" busy={busy} onClick={() => void submit()}>
          {title}
        </Button>
      </div>
    </Dialog>
  );
}

interface DeleteProps {
  open: boolean;
  onClose: () => void;
  t: T;
  action: string;
  name: string;
  resource: string;
  file: string;
  tab: string;
  recordKey: string;
}

/** Deletes ask first and say what goes; the button repeats the action. */
export function DeleteDialog({ open, onClose, t, action, name, resource, file, tab, recordKey }: DeleteProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    const result = await deleteRecord(resource, file, tab, recordKey);
    setBusy(false);
    if (result.ok) onClose();
    else setError(t(result.error));
  };
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title={t("ADMIN_DELETE_TITLE", name)} description={t("ADMIN_DELETE_DESC")}>
      <ErrorLine text={error} />
      <div className="flex justify-end gap-[0.8vh]">
        <Button variant="secondary" onClick={onClose}>
          {t("ADMIN_CANCEL")}
        </Button>
        <Button variant="destructive" busy={busy} onClick={() => void submit()}>
          {action}
        </Button>
      </div>
    </Dialog>
  );
}
