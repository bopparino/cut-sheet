import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CutsheetHeader } from "@/lib/schema";

type Props = {
  initial?: CutsheetHeader;
  // Existing builder names for the builder autocomplete (datalist).
  builders?: string[];
};

const REGIONS = ["", "MD", "VA", "WV"] as const;
const EQ_TO = ["", "Job", "Whs", "Hold"] as const;
const BUILDER_LIST_ID = "header-builder-options";

// Server component: renders header fields with defaultValue from `initial`.
// The parent <form action> Server Action picks them up via FormData.
export function HeaderFields({ initial, builders }: Props) {
  const h = initial;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {builders && builders.length > 0 && (
        <datalist id={BUILDER_LIST_ID}>
          {builders.map((b) => (
            <option key={b} value={b} />
          ))}
        </datalist>
      )}
      <Field label="Builder" name="builder" defaultValue={h?.builder} list={builders?.length ? BUILDER_LIST_ID : undefined} />
      <Field label="Project" name="project" defaultValue={h?.project} />
      <Field label="House Type" name="houseType" defaultValue={h?.houseType} />
      <Field label="Lot" name="lot" defaultValue={h?.lot} />
      <Field label="Block" name="block" defaultValue={h?.block} />
      <Field label="Section" name="section" defaultValue={h?.section} />
      <Field label="Foreman" name="foreman" defaultValue={h?.foreman} />
      <Field label="Project Code" name="projectCode" defaultValue={h?.projectCode} />
      <Field label="Option" name="option" defaultValue={h?.option} />
      <Field label="Prop #" name="propNumber" defaultValue={h?.propNumber} />
      <Field label="Zone" name="zone" defaultValue={h?.zone} />
      <Field label="Date" name="date" type="date" defaultValue={h?.date} />
      <Field label="Delivery Date" name="deliveryDate" type="date" defaultValue={h?.deliveryDate} />

      <SelectField label="Region" name="region" defaultValue={h?.region ?? ""} options={REGIONS} placeholder="-" />
      <SelectField label="Eq To" name="eqTo" defaultValue={h?.eqTo ?? ""} options={EQ_TO} placeholder="-" />
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  list,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  list?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="label-caps">{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} list={list} />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  options: readonly string[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="label-caps">{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="flex h-[38px] w-full rounded-sm border border-input bg-card px-[11px] text-[13.5px] outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "" ? (placeholder ?? "-") : opt.charAt(0).toUpperCase() + opt.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
