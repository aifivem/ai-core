import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCrosshairs,
  faLocationArrow,
  faVideo,
} from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Tooltip } from "../../../components/ui/tooltip";
import { myPosition, pickPoint, teleport, type Point } from "../worldActions";
import { useEditor } from "../context";
import { useField } from "./useField";

type Spec<W extends WidgetSpec["widget"]> = Extract<WidgetSpec, { widget: W }>;

const isPoint = (v: unknown): v is Point =>
  typeof v === "object" &&
  v !== null &&
  ["x", "y", "z"].every(
    (k) => typeof (v as Record<string, unknown>)[k] === "number",
  );

/** A place in the world: read only coordinates, "Use my position" (or the camera's) and a teleport there. */
export function PointW({ spec, path }: { spec: Spec<"point">; path: string }) {
  const { t } = useEditor();
  const [value, save] = useField(path);
  const point = isPoint(value) ? value : null;
  const fmt = (n: number) => n.toFixed(2);
  return (
    <div className="flex items-center gap-[0.8vh]">
      <Input
        readOnly
        aria-label={t(spec.label)}
        className="flex-1 font-mono text-[1.25vh] text-text-2"
        value={
          point
            ? `${fmt(point.x)}, ${fmt(point.y)}, ${fmt(point.z)}${spec.heading ? `  ${Math.round(point.heading ?? 0)}°` : ""}`
            : t("ADMIN_NOT_SET")
        }
      />
      <Button
        variant="ghost"
        onClick={async () => {
          const here = await myPosition(
            spec.from === "camera" ? "camera" : "ped",
            spec.ground === true,
          );
          if (here)
            save(spec.heading ? here : { x: here.x, y: here.y, z: here.z });
        }}
      >
        <FontAwesomeIcon
          icon={faCrosshairs}
          data-icon="inline-start"
          aria-hidden
        />
        {t(spec.from === "camera" ? "ADMIN_USE_CAMERA" : "ADMIN_USE_POSITION")}
      </Button>
      {spec.from !== "camera" && (
        <Tooltip content={t("ADMIN_PICK_FREECAM")}>
          <Button
            variant="icon"
            aria-label={t("ADMIN_PICK_FREECAM")}
            onClick={async () => {
              const picked = await pickPoint(spec.ground !== true);
              if (picked)
                save(
                  spec.heading
                    ? picked
                    : { x: picked.x, y: picked.y, z: picked.z },
                );
            }}
          >
            <FontAwesomeIcon icon={faVideo} aria-hidden />
          </Button>
        </Tooltip>
      )}
      <Tooltip content={t("ADMIN_TELEPORT")}>
        <Button
          variant="icon"
          disabled={!point}
          aria-label={t("ADMIN_TELEPORT")}
          onClick={() => point && teleport(point, spec.ground === true)}
        >
          <FontAwesomeIcon icon={faLocationArrow} aria-hidden />
        </Button>
      </Tooltip>
    </div>
  );
}
