import type { Cutsheet } from "@/lib/schema";
import { LEGAL_PAGE_CSS } from "@/components/cutsheet/replica/LegalScalePage";

export type FittingImage = { id: number; filename: string };

type Props = {
  cutsheet: Cutsheet;
  cutsheetId: number;
  images: FittingImage[];
  // When embedded in the combined print doc the page-level @page rule is set
  // once by the parent, so the standalone <style> is suppressed.
  embedded?: boolean;
};

const PER_PAGE = 6; // 2 columns × 3 rows on a Legal page

// Printable contact sheet of the fitting drawings (MS Paint exports) attached
// to a cutsheet. The warehouse builds 15-20 fittings per house off these, so
// they tile onto Legal (8.5×14) pages, paginated, with a ticket-style header on
// the first page. Images render via the /api/attachment/[id] blob route.
export function FittingsSheet({ cutsheet, cutsheetId, images, embedded = false }: Props) {
  const h = cutsheet.header;
  const name = cutsheet.name.trim();
  const pages = chunk(images, PER_PAGE);

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

      {images.length === 0 ? (
        <section className="px-2 py-2">
          <Header name={name} cutsheetId={cutsheetId} meta={meta} />
          <p className="py-10 text-center text-sm text-neutral-500">
            No fitting drawings attached.
          </p>
        </section>
      ) : (
        pages.map((pageImages, pageIndex) => (
          <section
            key={pageIndex}
            className={`px-2 ${pageIndex > 0 ? "break-before-page" : ""}`}
          >
            {pageIndex === 0 && <Header name={name} cutsheetId={cutsheetId} meta={meta} />}
            <div className="grid grid-cols-2 gap-3">
              {pageImages.map((img) => (
                <figure
                  key={img.id}
                  className="flex h-[3.4in] flex-col overflow-hidden rounded border border-black"
                >
                  <div className="flex min-h-0 flex-1 items-center justify-center bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/attachment/${img.id}`}
                      alt={img.filename}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <figcaption className="shrink-0 truncate border-t border-neutral-300 px-2 py-1 text-[8pt] text-neutral-600">
                    {img.filename}
                  </figcaption>
                </figure>
              ))}
            </div>
            <div className="mt-2 text-right text-[8pt] text-neutral-500">
              Fittings · Page {pageIndex + 1} of {pages.length} · Cutsheet #{cutsheetId}
            </div>
          </section>
        ))
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
