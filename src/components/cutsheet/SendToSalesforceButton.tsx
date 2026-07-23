"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CloudUpload, Lock } from "lucide-react";
import { flushPendingSaves } from "@/lib/print-flush";

type Props = {
  cutsheetId: number;
  // Staged-rollout gate (admin panel → Salesforce): when true, the click
  // opens a password popover and the push password rides along in the POST.
  // The server enforces this regardless — the prompt is UX, not security.
  requirePassword: boolean;
  // Same save-before-act contract as PrintPacketButton: what's on screen is
  // what gets sent.
  formId?: string;
  saveAction?: (formData: FormData) => Promise<void>;
};

type SendResponse = {
  ok?: boolean;
  error?: string;
  passwordRequired?: boolean;
  lot?: { prop: string; lotNumber: string; builder: string; address: string };
  files?: Array<{ kind: string; newVersion: boolean }>;
  warnings?: string[];
};

// Pushes the whole-house shop + foreman packets onto the matching Salesforce
// Lot record as two Files. Only rendered when the server says the Salesforce
// integration is configured (see salesforceEnabled()), so during the dormant
// scaffold phase nobody ever sees it.
export function SendToSalesforceButton({ cutsheetId, requirePassword, formId, saveAction }: Props) {
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [promptError, setPromptError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const doSend = async (pw?: string) => {
    setBusy(true);
    setPromptError(null);
    try {
      if (formId && saveAction) {
        const form = document.getElementById(formId);
        if (form instanceof HTMLFormElement) {
          await saveAction(new FormData(form));
        }
      }
      await flushPendingSaves();

      const res = await fetch(`/api/salesforce/send/${cutsheetId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pw ? { password: pw } : {}),
      });
      const json = (await res.json().catch(() => ({}))) as SendResponse;

      if (json.passwordRequired) {
        // Wrong or missing password: keep (or reopen) the prompt with the
        // server's message, ready for another try.
        setPromptError(json.error ?? "Push password required.");
        setOpen(true);
        return;
      }
      if (!res.ok || !json.ok) {
        throw new Error(json.error || `Sending failed (${res.status}).`);
      }

      setOpen(false);
      setPassword("");
      const versioned = json.files?.some((f) => f.newVersion);
      const lotBit = json.lot ? `lot ${json.lot.lotNumber || json.lot.prop} (${json.lot.builder})` : "the lot";
      toast.success(
        versioned
          ? `Updated both packets on ${lotBit} in Salesforce.`
          : `Sent both packets to ${lotBit} in Salesforce.`,
      );
      for (const w of json.warnings ?? []) toast.warning(w, { duration: 10000 });
    } catch (err) {
      setOpen(false);
      toast.error(err instanceof Error ? err.message : "Sending to Salesforce failed.", {
        duration: 10000,
      });
    } finally {
      setBusy(false);
    }
  };

  const onClick = () => {
    if (requirePassword) {
      setPromptError(null);
      setPassword("");
      setOpen((v) => !v);
    } else {
      void doSend();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-input px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-60"
      >
        <CloudUpload className="h-4 w-4" /> {busy ? "Sending…" : "Send to Salesforce"}
        {requirePassword && !busy && <Lock className="h-3 w-3 opacity-60" />}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-64 rounded-lg border border-border bg-card p-3 shadow-lg">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (password) void doSend(password);
            }}
            className="space-y-2"
          >
            <p className="text-[12.5px] font-semibold text-foreground">Push password</p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="off"
              className="h-9 w-full rounded-sm border border-input bg-card px-2.5 text-[13px] outline-none"
            />
            {promptError && (
              <p className="text-[12px] font-semibold text-[var(--danger-fg)]">{promptError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-8 rounded-sm border border-input px-2.5 text-[12.5px] font-semibold text-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !password}
                className="btn-glow h-8 rounded-sm bg-primary px-3 text-[12.5px] font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
