import { useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCrosshairs,
  faLocationArrow,
  faTrashCan,
  faVideo,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Button } from "../../../components/ui/button";
import { Tooltip } from "../../../components/ui/tooltip";
import { drawZone, myPosition, pickPoint, teleport } from "../actions";
import { useEditor } from "../context";
import { getAt } from "../path";
import { useField } from "./basic";

type Spec = Extract<WidgetSpec, { widget: "zone" }>;
interface Corner {
  x: number;
  y: number;
  z: number;
}

const toCorners = (value: unknown): Corner[] =>
  Array.isArray(value)
    ? value.flatMap((v) =>
        typeof v === "object" &&
        v !== null &&
        typeof v.x === "number" &&
        typeof v.y === "number" &&
        typeof v.z === "number"
          ? [{ x: v.x, y: v.y, z: v.z }]
          : [],
      )
    : [];

/**
 * A ground polygon: corners added with the free camera or the admin's position, removed one by one or all; the shape
 * is drawn in the world while the field is on screen (also behind the free camera while the next corner is picked).
 */
export function ZoneW({ spec, path }: { spec: Spec; path: string }) {
  const { record, t } = useEditor();
  const [value, save] = useField(path);
  const corners = toCorners(value);
  const max = spec.max ?? 32;
  const rawHeight = spec.heightPath ? getAt(record, spec.heightPath) : null;
  const height = typeof rawHeight === "number" ? rawHeight : 2;
  const shape = JSON.stringify(corners);
  useEffect(() => {
    drawZone({ points: JSON.parse(shape) as Corner[], height });
  }, [shape, height]);
  useEffect(() => () => drawZone(null), []);
  const add = (corner: Corner | null) => {
    if (corner && corners.length < max)
      save([...corners, { x: corner.x, y: corner.y, z: corner.z }]);
  };
  const fmt = (n: number) => n.toFixed(1);
  return (
    <div className="flex flex-col gap-[0.8vh]">
      <div className="flex flex-wrap items-center gap-[0.8vh]">
        <Button
          variant="ghost"
          disabled={corners.length >= max}
          onClick={async () => add(await pickPoint(false))}
        >
          <FontAwesomeIcon
            icon={faVideo}
            data-icon="inline-start"
            aria-hidden
          />
          {t("ADMIN_ZONE_ADD_CAMERA")}
        </Button>
        <Button
          variant="ghost"
          disabled={corners.length >= max}
          onClick={async () => add(await myPosition("ped", true))}
        >
          <FontAwesomeIcon
            icon={faCrosshairs}
            data-icon="inline-start"
            aria-hidden
          />
          {t("ADMIN_ZONE_ADD_HERE")}
        </Button>
        <span className="text-[1.25vh] text-text-3">
          {corners.length < 3
            ? t("ADMIN_ZONE_NEED", corners.length)
            : t("ADMIN_ZONE_CORNERS", corners.length)}
        </span>
        {corners.length > 0 && (
          <Tooltip content={t("ADMIN_ZONE_CLEAR")}>
            <Button
              variant="icon"
              className="ml-auto"
              aria-label={t("ADMIN_ZONE_CLEAR")}
              onClick={() => save([])}
            >
              <FontAwesomeIcon icon={faTrashCan} aria-hidden />
            </Button>
          </Tooltip>
        )}
      </div>
      {corners.length > 0 && (
        <ol className="flex flex-col gap-[0.4vh]">
          {corners.map((c, i) => (
            <li
              key={`${i}:${c.x}:${c.y}`}
              className="flex h-[3.2vh] items-center gap-[0.8vh] rounded-[0.8vh] bg-white/4 pr-[0.4vh] pl-[1vh] font-mono text-[1.2vh] text-text-2"
            >
              <span className="w-[2.4vh] text-text-4">{i + 1}</span>
              <span className="flex-1">{`${fmt(c.x)}, ${fmt(c.y)}, ${fmt(c.z)}`}</span>
              <Tooltip content={t("ADMIN_TELEPORT")}>
                <Button
                  variant="icon"
                  size="sm"
                  aria-label={t("ADMIN_TELEPORT")}
                  onClick={() => teleport(c, true)}
                >
                  <FontAwesomeIcon icon={faLocationArrow} aria-hidden />
                </Button>
              </Tooltip>
              <Tooltip content={t("ADMIN_REMOVE")}>
                <Button
                  variant="icon"
                  size="sm"
                  aria-label={t("ADMIN_REMOVE")}
                  onClick={() => save(corners.filter((_, j) => j !== i))}
                >
                  <FontAwesomeIcon icon={faXmark} aria-hidden />
                </Button>
              </Tooltip>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
