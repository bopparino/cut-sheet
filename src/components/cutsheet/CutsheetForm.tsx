"use client";

import type { KeyboardEvent } from "react";
import { toast } from "sonner";

type Props = {
  // Optional — present on /form/[id] so the toolbar Save button can target
  // this form via form="cutsheet-form". /form/new doesn't need it.
  formId?: string;
  // Bound Server Action (e.g. updateCutsheet.bind(null, id) or
  // createCutsheet). createCutsheet's redirect throws NEXT_REDIRECT, which
  // we re-raise so Next.js can complete the navigation — the success toast
  // intentionally never fires in that case.
  action: (formData: FormData) => Promise<void>;
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
// buttons, checkboxes, and radios are left alone — Enter has meaning there.
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

export function CutsheetForm({ formId, action, children, className }: Props) {
  return (
    <form
      id={formId}
      onKeyDown={handleEnterAsTab}
      action={async (formData) => {
        try {
          await action(formData);
          toast.success("Cutsheet saved.");
        } catch (err) {
          if (isRedirectError(err)) throw err;
          toast.error(err instanceof Error ? err.message : "Save failed.");
        }
      }}
      className={className}
    >
      {children}
    </form>
  );
}
