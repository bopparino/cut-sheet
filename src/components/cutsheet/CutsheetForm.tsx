"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { registerPrintFlush } from "@/lib/print-flush";

type Props = {
  // Optional - present on /form/[id] so the toolbar Save button can target
  // this form via form="cutsheet-form". /form/new doesn't need it.
  formId?: string;
  // Bound Server Action (e.g. updateCutsheet.bind(null, id) or
  // createCutsheet). createCutsheet's redirect throws NEXT_REDIRECT, which
  // we re-raise so Next.js can complete the navigation - the success toast
  // intentionally never fires in that case.
  action: (formData: FormData) => Promise<void>;
  // Debounced per-edit autosave (the replica editor turns this on). MUST stay
  // off for /form/new: autosaving createCutsheet would mint a new cutsheet
  // row per keystroke.
  autosave?: boolean;
  children: React.ReactNode;
  className?: string;
};

// Re-thrown redirects look like: throw { digest: "NEXT_REDIRECT;...", ... }.
function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

// Enter on text/number/date inputs advances focus to the next form control
// instead of submitting. Tab still works as normal. Selects, textareas,
// buttons, checkboxes, and radios are left alone - Enter has meaning there.
function handleEnterAsTab(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter") return;
  if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;

  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  const skipTypes = ["submit", "button", "reset", "checkbox", "radio"];
  if (skipTypes.includes(target.type)) return;

  e.preventDefault();
  const form = e.currentTarget;
  const focusable = Array.from(
    form.querySelectorAll<HTMLElement>(
      [
        'input:not([type="hidden"]):not([disabled]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])',
        "select:not([disabled])",
        "textarea:not([disabled])",
      ].join(", "),
    ),
  );
  const idx = focusable.indexOf(target);
  if (idx === -1) return;
  const next = focusable[idx + 1];
  if (next) next.focus();
}

const AUTOSAVE_DEBOUNCE_MS = 800;

const timeNow = () =>
  new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// The big sheet form. With `autosave` on, every edit debounces into a save -
// Kimmie shouldn't lose an hour of typing to a missed Save click. The Save
// button stays: it's the explicit "I'm done" and the fallback if an autosave
// ever fails.
export function CutsheetForm({ formId, action, autosave = false, children, className }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState("");

  // dirtyRef marks edits not yet carried by a dispatched save. chainRef
  // serializes EVERY save - auto and manual - so an older snapshot can never
  // land after a newer one and win the last-write race. Autosave snapshots
  // are taken inside the queued job (at dispatch, not at debounce), so a
  // queued save always carries the latest DOM.
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chainRef = useRef<Promise<void>>(Promise.resolve());
  const errorToastedRef = useRef(false);

  const queue = (job: () => Promise<void>): Promise<void> => {
    const p = chainRef.current.then(job);
    // The chain itself never rejects (a rejected link would skip every later
    // save); each job handles its own errors, and manual saves re-throw
    // redirects to React through `p`, not through the chain.
    chainRef.current = p.then(
      () => undefined,
      () => undefined,
    );
    return p;
  };

  const runAutosave = (): Promise<void> =>
    queue(async () => {
      const form = formRef.current;
      if (!form || !dirtyRef.current) return;
      dirtyRef.current = false;
      setStatus("saving");
      try {
        await action(new FormData(form));
        setStatus("saved");
        setSavedAt(timeNow());
        errorToastedRef.current = false;
      } catch (err) {
        // Keep the edits marked dirty - the next keystroke (or the Save
        // button) retries. No self-retry loop: a persistent failure would
        // hammer the server once per debounce forever.
        dirtyRef.current = true;
        setStatus("error");
        if (!errorToastedRef.current) {
          errorToastedRef.current = true;
          toast.error(
            err instanceof Error ? err.message : "Autosave failed - use the Save button.",
          );
        }
      }
    });

  const scheduleAutosave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runAutosave();
    }, AUTOSAVE_DEBOUNCE_MS);
  };

  const markDirty = () => {
    dirtyRef.current = true;
    scheduleAutosave();
  };

  // Push everything pending into the DB. Two passes bound the loop: one for
  // the current dirty state, one for edits that arrive while that save is in
  // flight. An autosave that errors stops the flush (runAutosave never
  // rejects) - retrying here would hang the Print that asked for the flush.
  const flush = async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    for (let i = 0; i < 2 && dirtyRef.current; i++) await runAutosave();
    await chainRef.current;
  };

  // Latest-value refs so the mount-only listeners below always call the
  // current closures (which capture the live `action`) without re-binding.
  const flushRef = useRef(flush);
  const markDirtyRef = useRef(markDirty);
  useEffect(() => {
    flushRef.current = flush;
    markDirtyRef.current = markDirty;
  });

  // Edit detection. 'input' fires per keystroke on text boxes; 'change'
  // covers selects, checkboxes, and radios. The listeners live on `document`
  // because the header's name input is associated via form= but is not a DOM
  // descendant of the form element - form-level listeners would miss it.
  // (new FormData(form) DOES include form-associated elements, so the
  // snapshot itself has it either way.)
  useEffect(() => {
    if (!autosave) return;
    const onEdit = (e: Event) => {
      const t = e.target as { form?: unknown } | null;
      if (t && typeof t === "object" && "form" in t && t.form === formRef.current) {
        markDirtyRef.current();
      }
    };
    document.addEventListener("input", onEdit);
    document.addEventListener("change", onEdit);
    return () => {
      document.removeEventListener("input", onEdit);
      document.removeEventListener("change", onEdit);
    };
  }, [autosave]);

  // What's on screen is what prints: Print buttons flush all registered
  // savers before building the packet (see print-flush.ts).
  useEffect(() => {
    if (!autosave) return;
    return registerPrintFlush(() => flushRef.current());
  }, [autosave]);

  // Best-effort flush when the tab hides or closes, and on unmount, so edits
  // made inside the debounce window aren't dropped by navigation.
  useEffect(() => {
    if (!autosave) return;
    const onPageHide = () => void flushRef.current();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") void flushRef.current();
    };
    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [autosave]);
  useEffect(() => {
    if (!autosave) return;
    return () => void flushRef.current();
  }, [autosave]);

  return (
    <form
      ref={formRef}
      id={formId}
      onKeyDown={handleEnterAsTab}
      onSubmit={() => {
        // Manual save incoming - cancel the pending debounce; the submit's
        // own FormData snapshot already carries those edits.
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }}
      action={(formData) =>
        queue(async () => {
          const wasDirty = dirtyRef.current;
          dirtyRef.current = false;
          try {
            await action(formData);
            toast.success("Cutsheet saved.");
            if (autosave) {
              setStatus("saved");
              setSavedAt(timeNow());
              errorToastedRef.current = false;
            }
          } catch (err) {
            if (isRedirectError(err)) throw err;
            if (wasDirty) dirtyRef.current = true;
            toast.error(err instanceof Error ? err.message : "Save failed.");
          }
        })
      }
      className={className}
    >
      {children}
      {autosave && status !== "idle" && (
        <div
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-lg backdrop-blur ${
            status === "error"
              ? "border-[var(--danger-line)] bg-[var(--danger-bg)] text-[var(--danger-fg)]"
              : "border-border bg-background/90 text-muted-foreground"
          }`}
        >
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? `✓ Autosaved ${savedAt}`
              : "Autosave failed — use the Save button"}
        </div>
      )}
    </form>
  );
}
