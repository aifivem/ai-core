import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import type { WidgetSpec } from "@aicore-fivem/shared";
import { Select } from "../../../components/ui/select";
import { useAppSelector } from "../../../store";
import { useEditor } from "../context";
import { getAt } from "../path";
import { useField } from "./useField";

type Spec = Extract<WidgetSpec, { widget: "grade" }>;

/**
 * A job or gang grade stored as its number: the grade names of the job or gang named at `of` (read in the row when
 * the field sits in a list). A grade that job does not have is flagged.
 */
export function GradeW({
  spec,
  path,
  base,
}: {
  spec: Spec;
  path: string;
  base?: string;
}) {
  const { t, record } = useEditor();
  const [value, save] = useField(path);
  const owner = getAt(record, base ? `${base}.${spec.of}` : spec.of);
  const options = useAppSelector((s) => s.admin.lookups[spec.lookup]);
  const grades = options.find((o) => o.value === owner)?.grades ?? [];
  const stored =
    typeof value === "number" && Number.isInteger(value) ? value : 0;
  const missing = grades.length > 0 && stored >= grades.length;
  return (
    <div className="flex shrink-0 items-center gap-[0.8vh]">
      <Select
        aria-label={t(spec.label)}
        className="w-[22vh]"
        value={grades.length > 0 && !missing ? String(stored) : undefined}
        placeholder={
          grades.length > 0 ? String(stored) : t("ADMIN_GRADE_PICK_FIRST")
        }
        options={grades.map((label, grade) => ({
          value: String(grade),
          label: `${grade} · ${label}`,
        }))}
        onChange={(picked) => {
          const grade = Number(picked);
          if (Number.isInteger(grade) && grade !== stored) save(grade);
        }}
      />
      {missing && (
        <span className="flex shrink-0 items-center gap-[0.5vh] rounded-[0.4vh] bg-danger-bg px-[0.7vh] py-[0.3vh] text-[1.1vh] font-semibold text-danger">
          <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden />
          {t("ADMIN_GRADE_MISSING")}
        </span>
      )}
    </div>
  );
}
