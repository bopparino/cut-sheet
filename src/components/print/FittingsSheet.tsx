import type { Cutsheet } from "@/lib/schema";
import { LEGAL_PAGE_CSS } from "@/components/cutsheet/replica/LegalScalePage";
import { FITTING_MAP } from "@/lib/fittings";
import { FittingThumb } from "@/components/cutsheet/FittingThumb";

export type FittingImage = { id: number; filename: string };

type Props = {
  cutsheet: Cutsheet;
  cutsheetId: number;
  images: FittingImage[];
  // When embedded in the combined print doc the page-level @page rule is set
  // once by the parent, so the standalone <style> is suppressed.
  embedded?: boolean;
};

// 3 columns × 4 rows on a Legal page — was 2×3, densified per shop feedback
// (fewer pages per packet; the drawings still read at ~2.5in square).
const PER_PAGE = 12;

// Printable contact sheet of the cutsheet's fittings. Two sources tile onto
// the same Legal (8.5×14) grid: fittings picked from the catalog (drawing +
// qty + per-side measurements, replacing the MS Paint ritual) come first,
// then any legacy attached images (via the /api/attachment/[id] blob route).
// The warehouse builds 15-20 fittings per house off this sheet.
export function FittingsSheet({ cutsheet, cutsheetId, images, embedded = false }: Props) {
  const h = cutsheet.header;
  const name = cutsheet.name.trim();

  const legacyImages = images.filter((img) => img.filename.includes("(Access)"));
  const photoImages = images.filter((img) => !img.filename.includes("(Access)"));

  const picked = cutsheet.fittings
    .map((row) => ({ row, def: FITTING_MAP.get(row.type) }))
    .filter((x): x is { row: (typeof cutsheet.fittings)[number]; def: NonNullable<ReturnType<typeof FITTING_MAP.get>> } => Boolean(x.def));

  const figures: React.ReactNode[] = [
    ...picked.map(({ row, def }, i) => (
      <figure key={`f${i}`} className="flex h-[2.9in] flex-col overflow-hidden rounded border border-black">
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-white p-1">
          <span className="absolute left-2 top-1 z-10 text-[14pt] font-bold">
            {row.qty > 0 ? `× ${row.qty}` : ""}
          </span>
          {/* Measurements print exactly where they were placed on the drawing
              in the editor - the position says which side the number is for.
              zoom leaves a gutter so edge-anchored sizes don't clip. */}
          <FittingThumb def={def} zoom={0.84} className="h-full w-full">
            {row.labels
              .filter((l) => l.text.trim())
              .map((l, j) => (
                <span
                  key={j}
                  style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-white/85 px-0.5 text-[13pt] font-bold leading-none text-black"
                >
                  {l.text}
                </span>
              ))}
          </FittingThumb>
        </div>
        <figcaption className="shrink-0 border-t border-neutral-300 px-2 py-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="whitespace-nowrap text-[9pt] font-bold uppercase">
              {def.label}
              {/* Explicit either way: a missing mark is not the same as "no". */}
              {row.sl ? (
                <span className="ml-1.5 rounded-sm bg-black px-1 text-white">SL YES</span>
              ) : (
                <span className="ml-1.5 font-normal text-neutral-500">SL NO</span>
              )}
            </span>
            {/* Notes wrap rather than truncate — a clipped note ("both ends
                o…") reads as a different instruction on the shop floor. */}
            {row.notes && (
              <span className="min-w-0 flex-1 text-right text-[9pt] leading-tight text-neutral-700">
                {row.notes}
              </span>
            )}
          </div>
        </figcaption>
      </figure>
    )),
    ...photoImages.map((img) => (
      <figure key={`i${img.id}`} className="flex h-[2.9in] flex-col overflow-hidden rounded border border-black">
        <div className="flex min-h-0 flex-1 items-center justify-center bg-white p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/attachment/${img.id}`} alt={img.filename} className="max-h-full max-w-full object-contain" />
        </div>
        <figcaption className="shrink-0 truncate border-t border-neutral-300 px-2 py-1 text-[8pt] text-neutral-600">
          {img.filename}
        </figcaption>
      </figure>
    )),
  ];
  const pages = chunk(figures, PER_PAGE);

  const meta = [
    h.builder,
    h.project,
    [h.lot, h.block, h.section].filter(Boolean).join(" / ") ? `Lot ${[h.lot, h.block, h.section].filter(Boolean).join(" / ")}` : "",
    h.propNumber ? `Prop# ${h.propNumber}` : "",
    h.zone ? `Zone ${h.zone}` : "",
  ].filter(Boolean);

  return (
    <div className="font-sans text-black">
      {!embedded && <style>{LEGAL_PAGE_CSS}</style>}

      {figures.length === 0 && legacyImages.length === 0 ? (
        <section className="px-2 py-2">
          <Header name={name} cutsheetId={cutsheetId} meta={meta} />
          <p className="py-10 text-center text-sm text-neutral-500">
            No fittings on this cut sheet. Sheets imported from the old Access library come
            over without fittings — open the sheet and pick them from the catalog.
          </p>
        </section>
      ) : (
        <>
          {pages.map((pageFigures, pageIndex) => (
            <section
              key={pageIndex}
              className={`px-2 ${pageIndex > 0 ? "break-before-page" : ""}`}
            >
              {pageIndex === 0 && <Header name={name} cutsheetId={cutsheetId} meta={meta} />}
              <div className="grid grid-cols-3 gap-2">{pageFigures}</div>
              <div className="mt-2 text-right text-[8pt] text-neutral-500">
                Fittings · Page {pageIndex + 1} of {pages.length} · Cutsheet #{cutsheetId}
              </div>
            </section>
          ))}
          {/* Legacy whiteboard drawings: Kimmy drew every fitting for the house
              on ONE canvas, so each image gets a full page of its own instead
              of a 2.9-inch grid cell - the shop needs to read the dimensions. */}
          {legacyImages.map((img, i) => (
            <section
              key={`img${img.id}`}
              className={`px-2 ${pages.length > 0 || i > 0 ? "break-before-page" : ""}`}
            >
              {pages.length === 0 && i === 0 && <Header name={name} cutsheetId={cutsheetId} meta={meta} />}
              <div className="flex h-[11.5in] items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/attachment/${img.id}`}
                  alt={img.filename}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="mt-1 text-right text-[8pt] text-neutral-500">
                {img.filename} · Legacy drawing {i + 1} of {legacyImages.length} · Cutsheet #{cutsheetId}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function Header({ name, cutsheetId, meta }: { name: string; cutsheetId: number; meta: string[] }) {
  return (
    <header className="mb-4 flex items-end justify-between border-b-2 border-black pb-2">
      <div>
        <h1 className="text-2xl font-bold uppercase tracking-tight">Fittings</h1>
        {meta.length > 0 && (
          <p className="mt-1 text-[10pt] text-neutral-700">{meta.join(" · ")}</p>
        )}
      </div>
      <div className="text-right text-xs">
        {name ? (
          <>
            <div className="font-semibold">{name}</div>
            <div className="text-neutral-500">Cutsheet #{cutsheetId}</div>
          </>
        ) : (
          <div className="font-semibold">Cutsheet #{cutsheetId}</div>
        )}
      </div>
    </header>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
