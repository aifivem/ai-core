import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { Dialog } from "../../../components/ui/dialog";
import { useAppSelector } from "../../../store";
import { fieldId, runAction } from "../actions";
import { useEditor } from "../context";
import { iconOf } from "../icons";

type Spec = Extract<WidgetSpec, { widget: "action" }>;

/** A button that runs the script's handler on this record; `confirm` asks first. The result shows under it (FieldShell). */
export function ActionW({ spec }: { spec: Spec }) {
  const { resource, file, key, t } = useEditor();
  const [asking, setAsking] = useState(false);
  const busy = useAppSelector(
    (s) =>
      s.admin.fields[fieldId(resource, file, key, spec.path)]?.status ===
      "saving",
  );
  const run = () => {
    setAsking(false);
    void runAction(resource, file, key, spec.path);
  };
  return (
    <>
      <Button
        variant={spec.danger ? "danger" : "secondary"}
        busy={busy}
        onClick={() => (spec.confirm ? setAsking(true) : run())}
      >
        {spec.icon && (
          <FontAwesomeIcon
            icon={iconOf(spec.icon)}
            data-icon="inline-start"
            aria-hidden
          />
        )}
        {t(spec.button)}
      </Button>
      {spec.confirm && (
        <Dialog
          open={asking}
          onOpenChange={(next) => !next && setAsking(false)}
          title={t(spec.label || spec.button)}
          description={t(spec.confirm)}
        >
          <div className="flex justify-end gap-[0.8vh]">
            <Button variant="secondary" onClick={() => setAsking(false)}>
              {t("ADMIN_CANCEL")}
            </Button>
            <Button
              variant={spec.danger ? "destructive" : "primary"}
              onClick={run}
            >
              {t(spec.button)}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
