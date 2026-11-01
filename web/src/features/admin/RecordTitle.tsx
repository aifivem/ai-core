import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLock, faTrash } from "@fortawesome/free-solid-svg-icons";
import { Button } from "../../components/ui/button";

/** The open record's title row: label, key, and its delete button (or the locked note). */
export function RecordTitle({
  label,
  recordKey,
  locked,
  deleteLabel,
  onDelete,
  t,
}: {
  label: string;
  recordKey: string;
  locked: boolean;
  deleteLabel: string | undefined;
  onDelete: () => void;
  t: (key: string) => string;
}) {
  return (
    <div className="flex shrink-0 items-center gap-[1.2vh] pb-[1.6vh]">
      <span className="flex min-w-0 flex-col gap-[0.4vh]">
        <span
          title={label}
          className="truncate text-[2.1vh] leading-[1.2] font-semibold"
        >
          {label}
        </span>
        <span className="truncate font-mono text-[1.25vh] leading-[1.2] text-text-3">
          {recordKey}
        </span>
      </span>
      <span className="flex-1" />
      {locked ? (
        <span className="flex items-center gap-[0.6vh] text-[1.3vh] text-tgi-green">
          <FontAwesomeIcon icon={faLock} aria-hidden />
          {t("ADMIN_LOCKED")}
        </span>
      ) : (
        deleteLabel && (
          <Button variant="danger" onClick={onDelete}>
            <FontAwesomeIcon
              icon={faTrash}
              data-icon="inline-start"
              aria-hidden
            />
            {t(deleteLabel)}
          </Button>
        )
      )}
    </div>
  );
}
