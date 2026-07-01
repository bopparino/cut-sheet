import type { Cutsheet } from "@/lib/schema";

// Shared building blocks for the editable cut-sheet replica (both pages). Each
// printed box becomes an <input>/<select> carrying the exact FormData name the
// save action and PDF pipeline read - binding is name-based, so layout is fully
// decoupled from save/output. Server components: inputs use defaultValue and
// the parent <form action> reads them via FormData.

export type WHRow = { qty: number; w: string; h: string };
export type CDRow = { qty: number; w: string; h: string; l: string; sl: "Y" | "N" };

// A single cell in a variant table: either an editable qty box bound to `name`,
// or a blacked-out box (a size the shop never orders in that variant - e.g.
// Flex R4 outside 4/6/8 - so there's nothing to fill).
export type Cell = { name: string; value: number } | { blackout: true };

const numClass =
  "h-5 w-9 shrink-0 border border-black bg-white text-center text-[9px] tabular-nums outline-none focus:bg-yellow-100";

export function QtyInput({ name, value }: { name: string; value: number }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      name={name}
      defaultValue={value === 0 ? "" : value}
      className={numClass}
    />
  );
}

export function TextInput({
  name,
  value,
  className,
}: {
  name: string;
  value: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      name={name}
      defaultValue={value}
      className={`h-5 border border-black bg-white px-0.5 text-[9px] outline-none focus:bg-yellow-100 ${className ?? ""}`}
    />
  );
}

export function QtyInputList<T extends string>({
  prefix,
  sizes,
  values,
  label,
  // Light gray rule under each row - applied across all qty-list sections for a
  // cohesive ledger look (the thick-black-border W/H tables, the fitting grid,
  // and the register lists opt out by using different components).
  ruled = true,
}: {
  prefix: string;
  sizes: readonly T[];
  values: Record<T, number>;
  label?: (s: T) => string;
  ruled?: boolean;
}) {
  return (
    <div className={ruled ? "space-y-1" : "space-y-0.5"}>
      {sizes.map((s) => (
        <div
          key={s}
          className={`flex items-center justify-between gap-1 ${ruled ? "border-b border-neutral-300 pb-0.5" : ""}`}
        >
          <span className="truncate">{label ? label(s) : s}</span>
          <QtyInput name={`${prefix}.${s}`} value={values[s]} />
        </div>
      ))}
    </div>
  );
}

export function SingletonInputRow({
  label,
  name,
  value,
}: {
  label: string;
  name: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-1 border-b border-neutral-300 pb-0.5">
      <span className="truncate">{label}</span>
      <QtyInput name={name} value={value} />
    </div>
  );
}

// General variant table: a Size column plus N labelled columns. Each row
// supplies its own cells, so the (column,row)→schema-key mapping can be
// anything - used for Round Coll/VD, Metal/Screen, Mid Atl, Flex Un/R4/R8, etc.
export function MultiQtyInputTable({
  colLabels,
  rows,
}: {
  colLabels: string[];
  rows: { label: string; cells: Cell[] }[];
}) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className="bg-neutral-200 px-0.5 text-left text-[8px] font-bold uppercase">Size</th>
          {colLabels.map((c) => (
            <th key={c} className="bg-neutral-200 px-0.5 text-center text-[8px] font-bold uppercase">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label}>
            <td className="border-b border-neutral-300 px-0.5">{r.label}</td>
            {r.cells.map((cell, i) => (
              <td key={i} className="border-b border-neutral-300 px-0 py-px text-center">
                {"blackout" in cell ? (
                  <span className="inline-block h-5 w-9 border border-black bg-black" />
                ) : (
                  <QtyInput name={cell.name} value={cell.value} />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function WHInputTable({
  prefix,
  rows,
  initial,
}: {
  prefix: string;
  rows: number;
  initial: WHRow[];
}) {
  const count = Math.max(rows, initial.length);
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {["Qty", "W", "H"].map((h) => (
            <th key={h} className="border border-black bg-neutral-200 text-center text-[8px] font-bold uppercase">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: count }).map((_, i) => {
          const r = initial[i];
          return (
            <tr key={i}>
              <td className="border border-black p-0">
                <QtyInput name={`${prefix}.${i}.qty`} value={r?.qty ?? 0} />
              </td>
              <td className="border border-black p-0">
                <TextInput name={`${prefix}.${i}.w`} value={r?.w ?? ""} className="w-full border-0" />
              </td>
              <td className="border border-black p-0">
                <TextInput name={`${prefix}.${i}.h`} value={r?.h ?? ""} className="w-full border-0" />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function CustomDuctInputTable({
  prefix,
  rows,
  initial,
}: {
  prefix: string;
  rows: number;
  initial: CDRow[];
}) {
  const count = Math.max(rows, initial.length);
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {["Qty", "W", "H", "L", "S/L"].map((h) => (
            <th key={h} className="border border-black bg-neutral-200 text-center text-[8px] font-bold uppercase">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: count }).map((_, i) => {
          const r = initial[i];
          return (
            <tr key={i}>
              <td className="border border-black p-0">
                <QtyInput name={`${prefix}.${i}.qty`} value={r?.qty ?? 0} />
              </td>
              <td className="border border-black p-0">
                <TextInput name={`${prefix}.${i}.w`} value={r?.w ?? ""} className="w-full border-0" />
              </td>
              <td className="border border-black p-0">
                <TextInput name={`${prefix}.${i}.h`} value={r?.h ?? ""} className="w-full border-0" />
              </td>
              <td className="border border-black p-0">
                <TextInput name={`${prefix}.${i}.l`} value={r?.l ?? ""} className="w-full border-0" />
              </td>
              <td className="border border-black p-0 text-center">
                <select
                  name={`${prefix}.${i}.sl`}
                  defaultValue={r?.sl ?? "N"}
                  className="h-5 w-full bg-white text-center text-[9px] outline-none focus:bg-yellow-100"
                >
                  <option value="N">N</option>
                  <option value="Y">Y</option>
                </select>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Free-text line list (custom.miscellaneous, registers/grills). One text input
// per row; the FormData readers skip blank lines.
export function MiscInputList({
  prefix,
  rows,
  initial,
}: {
  prefix: string;
  rows: number;
  initial: string[];
}) {
  const count = Math.max(rows, initial.length);
  return (
    <div className="space-y-0.5">
      {Array.from({ length: count }).map((_, i) => (
        <TextInput key={i} name={`${prefix}.${i}`} value={initial[i] ?? ""} className="w-full" />
      ))}
    </div>
  );
}

// `gapTop` breaks the contiguous bordered stack: it adds a margin above the
// section and restores its own top border, so the section reads as a separated
// box rather than butting against the one above.
export function Section({
  title,
  children,
  gapTop,
}: {
  title: string;
  children: React.ReactNode;
  gapTop?: boolean;
}) {
  return (
    <div className={`border border-black ${gapTop ? "mt-2" : "border-t-0 first:border-t"}`}>
      <div className="border-b border-black bg-neutral-50 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide">
        {title}
      </div>
      <div className="p-1">{children}</div>
    </div>
  );
}

// Shared header (same field grid for both pages; only the title differs).
export function ReplicaHeader({
  title,
  header,
  editable = true,
}: {
  title: string;
  header: Cutsheet["header"];
  // The header shows on both pages, but only ONE may submit - otherwise
  // FormData holds two values per field and the second page's edits are
  // silently dropped. Page 2 passes editable={false}: same look, read-only.
  editable?: boolean;
}) {
  return (
    <header className="border-2 border-black">
      <div className="flex items-center justify-between border-b border-black px-2 py-1">
        <span className="text-base font-bold uppercase tracking-wide">{title}</span>
        <span className="text-[10px]">Pad #__________</span>
      </div>
      <HRow>
        <HF label="Builder" name="builder" value={header.builder} flex={4} editable={editable} />
        <HF label="Date" name="date" value={header.date} flex={1.3} type="date" editable={editable} />
        <HF label="Delivery Date" name="deliveryDate" value={header.deliveryDate} flex={1.5} type="date" editable={editable} />
      </HRow>
      <HRow>
        <HF label="Project" name="project" value={header.project} flex={4} editable={editable} />
        <HF label="Project Code" name="projectCode" value={header.projectCode} flex={1.5} editable={editable} />
        <HF label="Option" name="option" value={header.option} flex={1.3} editable={editable} />
      </HRow>
      <HRow>
        <HF label="House Type" name="houseType" value={header.houseType} flex={2.2} editable={editable} />
        <HF label="Foreman" name="foreman" value={header.foreman} flex={1.8} editable={editable} />
        <SelectField label="Region" name="region" value={header.region} options={["", "MD", "VA", "WV"]} flex={1.7} editable={editable} />
        <SelectField label="Eq To" name="eqTo" value={header.eqTo} options={["", "Job", "Whs", "Hold"]} flex={1.7} last editable={editable} />
      </HRow>
      <HRow last>
        <HF label="Lot" name="lot" value={header.lot} flex={1} editable={editable} />
        <HF label="Block" name="block" value={header.block} flex={1} editable={editable} />
        <HF label="Section" name="section" value={header.section} flex={1} editable={editable} />
        <HF label="Prop #" name="propNumber" value={header.propNumber} flex={1.4} editable={editable} />
        <HF label="Zone" name="zone" value={header.zone} flex={1} editable={editable} />
      </HRow>
    </header>
  );
}

function HRow({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return <div className={`flex items-stretch ${last ? "" : "border-b border-black"}`}>{children}</div>;
}

function HF({
  label,
  name,
  value,
  flex,
  type = "text",
  editable,
}: {
  label: string;
  name: string;
  value: string;
  flex: number;
  type?: string;
  editable: boolean;
}) {
  return (
    <div className="flex items-center gap-1 border-r border-black px-1.5 py-1 last:border-r-0" style={{ flex }}>
      <span className="shrink-0 text-[8px] font-medium uppercase tracking-wide text-neutral-600">{label}</span>
      {editable ? (
        <input
          type={type}
          name={name}
          defaultValue={value}
          className="min-w-0 flex-1 border-b border-black bg-white text-[10px] outline-none focus:bg-yellow-100"
        />
      ) : (
        <span className="min-w-0 flex-1 truncate border-b border-black text-[10px]">{value}</span>
      )}
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
  flex,
  last,
  editable,
}: {
  label: string;
  name: string;
  value: string;
  options: string[];
  flex: number;
  last?: boolean;
  editable: boolean;
}) {
  return (
    <div className={`flex items-center gap-1 px-1.5 py-1 ${last ? "" : "border-r border-black"}`} style={{ flex }}>
      <span className="shrink-0 text-[8px] font-medium uppercase tracking-wide text-neutral-600">{label}</span>
      {editable ? (
        <select name={name} defaultValue={value} className="min-w-0 flex-1 border-b border-black bg-white text-[10px] outline-none focus:bg-yellow-100">
          {options.map((o) => (
            <option key={o} value={o}>{o || "-"}</option>
          ))}
        </select>
      ) : (
        <span className="min-w-0 flex-1 truncate border-b border-black text-[10px]">{value || "-"}</span>
      )}
    </div>
  );
}
