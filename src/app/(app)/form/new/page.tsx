import { HeaderFields } from "@/components/cutsheet/HeaderFields";
import { CutsheetForm } from "@/components/cutsheet/CutsheetForm";
import { createCutsheet } from "@/lib/actions";
import { listBuilderNames } from "@/lib/builders";

const FORM_ID = "new-cutsheet-form";

export const dynamic = "force-dynamic";

export default function NewCutsheetPage() {
  const builders = listBuilderNames();
  return (
    <div>
      <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/85 px-8 py-4 backdrop-blur">
        <h1 className="text-2xl font-extrabold uppercase tracking-tight text-foreground">New cutsheet</h1>
        <button
          type="submit"
          form={FORM_ID}
          className="btn-glow ml-auto rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Create
        </button>
      </header>

      <div className="px-8 py-7">
        <CutsheetForm formId={FORM_ID} action={createCutsheet} className="space-y-5">
          <input
            type="text"
            name="name"
            aria-label="Cutsheet name"
            placeholder="Untitled cutsheet"
            className="w-full max-w-xl rounded-lg bg-transparent text-2xl font-semibold tracking-tight outline-none placeholder:text-muted-foreground/50 focus-visible:bg-accent/40"
          />
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-base font-bold">
              <span className="h-2 w-2 rounded-full bg-primary" /> Header
            </h2>
            <HeaderFields builders={builders} />
          </section>
          <p className="text-sm text-muted-foreground">
            Fill in any header fields you have now - the rest of the sections become editable after
            the cutsheet is created.
          </p>
        </CutsheetForm>
      </div>
    </div>
  );
}
