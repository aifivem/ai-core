import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPlus, faTrash } from "@fortawesome/free-solid-svg-icons"
import type { WidgetSpec } from "@aicore-fivem/shared"
import { Button } from "../../../components/ui/button"
import { useEditor } from "../context"
import { NumberW, SwitchW, TextW, useField } from "./basic"
import { PointW } from "./more"

type Spec = Extract<WidgetSpec, { widget: "list" }>

/** One control of a row; the label sits above it so a row of several numbers stays readable. */
function RowControl({ spec, path }: { spec: WidgetSpec; path: string }) {
  const { t } = useEditor()
  const control =
    spec.widget === "text" ? (
      <TextW spec={spec} path={path} />
    ) : spec.widget === "number" ? (
      <NumberW spec={spec} path={path} />
    ) : spec.widget === "switch" ? (
      <SwitchW spec={spec} path={path} />
    ) : spec.widget === "point" ? (
      <PointW spec={spec} path={path} />
    ) : null
  if (!control) return null
  return (
    <label
      className={`flex flex-col gap-[0.4vh] ${spec.widget === "text" || spec.widget === "point" ? "min-w-0 flex-1" : "shrink-0"}`}
    >
      <span className="px-[0.4vh] text-[1.15vh] font-medium text-text-3">
        {t(spec.label)}
      </span>
      <div
        className={`flex h-[3.6vh] items-center ${spec.widget === "point" ? "[&>*]:flex-1" : ""}`}
      >
        {control}
      </div>
    </label>
  )
}

/** Rows of the same shape (job grades, route checkpoints): edit in place, remove one, add one at the end. */
export function ListW({ spec }: { spec: Spec }) {
  const { t } = useEditor()
  const [value, save] = useField(spec.path)
  const rows = Array.isArray(value) ? value : []
  const full = spec.max !== undefined && rows.length >= spec.max
  return (
    <div className="flex flex-col gap-[0.8vh] pb-[0.4vh]">
      {rows.map((_, index) => (
        <div
          key={index}
          className="flex items-end gap-[1.2vh] rounded-[0.8vh] bg-white/3 px-[1.2vh] pt-[0.8vh] pb-[1vh] transition-[background-color] duration-150 hover:bg-white/6"
        >
          {spec.rowLabel && (
            <span className="mb-[0.9vh] w-[7vh] shrink-0 text-[1.35vh] font-medium text-text-2">
              {t(spec.rowLabel, index + 1)}
            </span>
          )}
          {spec.rows.map((row) => (
            <RowControl
              key={row.path}
              spec={row}
              path={`${spec.path}.${index}.${row.path}`}
            />
          ))}
          <Button
            variant="icon"
            className="enabled:hover:bg-danger-bg enabled:hover:text-danger"
            aria-label={`${t("ADMIN_REMOVE")} ${index + 1}`}
            disabled={rows.length <= 1}
            onClick={() => save(rows.filter((__, i) => i !== index))}
          >
            <FontAwesomeIcon icon={faTrash} />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        className="self-start"
        disabled={full}
        onClick={() => save([...rows, spec.newRow])}
      >
        <FontAwesomeIcon icon={faPlus} data-icon="inline-start" aria-hidden />
        {t(spec.addLabel)}
      </Button>
    </div>
  )
}
