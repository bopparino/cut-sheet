"use client";

import { toast } from "sonner";

type Props = {
  formId: string;
  // Bound Server Action (e.g. updateCutsheet.bind(null, id)). Passed in from
  // the parent server component so the form here doesn't need to know about
  // the cutsheet id directly.
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
};

// Thin client wrapper around <form action={...}> that surfaces save success
// and failure as toasts. Server Components passed as `children` keep their
// SSR behavior — only the form element itself is client-side.
export function CutsheetForm({ formId, action, children, className }: Props) {
  return (
    <form
      id={formId}
      action={async (formData) => {
        try {
          await action(formData);
          toast.success("Cutsheet saved.");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Save failed.");
        }
      }}
      className={className}
    >
      {children}
    </form>
  );
}
