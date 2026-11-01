import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faLocationArrow, faVideo } from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tooltip } from "../../../components/ui/tooltip";
import { pickEntity, teleport } from "../worldActions";
import { saveField } from "../editActions";
import { useEditor } from "../context";
import { getAt } from "../path";
import { useField } from "./useField";

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>;

/** A world object picked with the free camera: its position at `path`, its model name at `modelPath`. */
export function EntityW({
  spec,
  path,
}: {
  spec: Spec<"entity">;
  path: string;
}) {
  const { t, resource, file, key, record } = useEditor();
  const [value, save] = useField(path);
  const point =
    typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : null;
  const model = getAt(record, spec.modelPath);
  const fmt = (n: unknown) => (typeof n === "number" ? n.toFixed(2) : "?");
  const at =
    point &&
    typeof point.x === "number" &&
    typeof point.y === "number" &&
    typeof point.z === "number"
      ? { x: point.x, y: point.y, z: point.z }
      : null;
  return (
    <div className="flex items-center gap-[0.8vh]">
      <Input
        readOnly
        aria-label={t(spec.label)}
        className="flex-1 font-mono text-[1.25vh] text-text-2"
        value={
          point
            ? `${typeof model === "string" && model ? model : "?"}  ${fmt(point.x)}, ${fmt(point.y)}, ${fmt(point.z)}`
            : t("ADMIN_NOT_SET")
        }
      />
      <Button
        variant="ghost"
        onClick={async () => {
          const picked = await pickEntity();
          if (!picked) return;
          void saveField(resource, file, key, spec.modelPath, picked.model);
          save({ x: picked.x, y: picked.y, z: picked.z });
        }}
      >
        <FontAwesomeIcon icon={faVideo} data-icon="inline-start" aria-hidden />
        {t("ADMIN_PICK_ENTITY")}
      </Button>
      <Tooltip content={t("ADMIN_TELEPORT")}>
        <Button
          variant="icon"
          disabled={!at}
          aria-label={t("ADMIN_TELEPORT")}
          onClick={() => at && teleport(at, true)}
        >
          <FontAwesomeIcon icon={faLocationArrow} aria-hidden />
        </Button>
      </Tooltip>
    </div>
  );
}
